import re
import io
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.core.security import get_current_active_user

router = APIRouter(prefix="/api/pdf", tags=["pdf"])


def _extract_text(content: bytes) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        return "\n".join(p.extract_text() or "" for p in reader.pages)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"No se pudo leer el PDF: {e}")


def _parse(text: str) -> dict:
    result = {}

    # OT — "Nº de ST: 57661441"
    m = re.search(r'N[º°o]\s*de\s*ST:\s*(\d+)', text, re.IGNORECASE)
    if m:
        result["ot"] = m.group(1)

    # Tipo — CORRECTIVO / PREVENTIVO
    if re.search(r'\bCORRECTIVO\b', text, re.IGNORECASE):
        result["tipo"] = "Correctivo"
    elif re.search(r'\bPREVENTIVO\b', text, re.IGNORECASE):
        result["tipo"] = "Preventivo"

    # Prioridad — "Prioridad: Baja" del PDF, pero PMR/ASC en el equipo → Media
    m = re.search(r'Prioridad:\s*(Alta|Media|Baja)', text, re.IGNORECASE)
    if m:
        result["prioridad"] = m.group(1).capitalize()

    # Sobreescribir prioridad según tipo de equipo: si hay PMR o ASC → Media, resto → Baja
    m_infn = re.search(r'INFN_\S+', text, re.IGNORECASE)
    if m_infn:
        nombre_eq = m_infn.group(0).upper()
        result["prioridad"] = "Media" if ("PMR" in nombre_eq or "ASC" in nombre_eq) else "Baja"

    # Equipo — "Equipo: 0IFINFN003100"
    m = re.search(r'Equipo:\s*(0IF\S+)', text, re.IGNORECASE)
    if m:
        result["equipo_afectado"] = m.group(1)

    # Fecha alta — "Fecha Alta: 17.05.2026 / 15:48:15" → "17/05/2026 15:48"
    m = re.search(r'Fecha Alta:\s*(\d{2})\.(\d{2})\.(\d{4})\s*/\s*(\d{2}:\d{2})', text)
    if m:
        result["fecha_hora"] = f"{m.group(1)}/{m.group(2)}/{m.group(3)} {m.group(4)}"

    # Estación — parte dentro del paréntesis → "LAGO" → "Lago"
    m_est = re.search(r'Descripci[oó]n:\s*\*?V\.ÚNICO\(([^)]+)\)', text, re.IGNORECASE)
    if m_est:
        result["estacion"] = m_est.group(1).strip().title()

    # Zona — combinación de Ubicación Técnica + E.XXXX + INFN_XXXX
    m_ub   = re.search(r'Ubicaci[oó]n T[eé]cnica:\s*(\S+)', text)
    m_desc = re.search(r'Descripci[oó]n:\s*\*?V\.ÚNICO\([^)]+\)\s+(\S+)', text, re.IGNORECASE)
    m_infn = re.search(r'Equipo:\s*0IF\S+\s+(\S+)', text, re.IGNORECASE)
    partes = [
        m_ub.group(1).strip()   if m_ub   else '',
        m_desc.group(1).strip() if m_desc else '',
        m_infn.group(1).strip() if m_infn else '',
    ]
    zona = ' '.join(p for p in partes if p)
    if zona:
        result["zona"] = zona

    # Descripción — OBSERVACIONES página 2 (texto más completo)
    m = re.search(r'OBSERVACIONES\n(.+?)(?=\nULTIMOS|\nFIRMA|$)', text, re.DOTALL | re.IGNORECASE)
    if m:
        obs = m.group(1).strip()
        # Limpiar los "/" de relleno del formulario
        obs = re.sub(r'(\s*/\s*)+$', '', obs).strip()
        obs = re.sub(r'\s+', ' ', obs)
        if obs:
            result["descripcion_fallo"] = obs

    return result


@router.post("/parse")
async def parse_pdf(
    file: UploadFile = File(...),
    _: dict = Depends(get_current_active_user),
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="El archivo debe ser un PDF")
    content = await file.read()
    text = _extract_text(content)
    data = _parse(text)
    if not data:
        raise HTTPException(status_code=422, detail="No se pudieron extraer datos del PDF")
    return data


@router.post("/parse/")
async def parse_pdf_slash(
    file: UploadFile = File(...),
    _: dict = Depends(get_current_active_user),
):
    return await parse_pdf(file, _)