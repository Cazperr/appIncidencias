import re
import io
import difflib
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from app.core.security import get_current_active_user

router = APIRouter(prefix="/api/pdf", tags=["pdf"])

# Lista de estaciones para matching — sincronizada con constants.js
ESTACIONES = [
    "Acacias","Aeropuerto T1-T2-T3","Aeropuerto T4","Alfonso XIII","Alonso Martínez",
    "Alto del Arenal","Aluche","Alvarado","Antón Martín","Aravaca",
    "Arganzuela-Planetario","Argüelles","Arroyofresno","Artilleros","Arturo Soria",
    "Ascao","Atocha","Atocha Renfe","Avenida de América","Avenida de la Paz",
    "Barrio de la Concepción","Barrio del Pilar","Barrio del Puerto","Batán",
    "Begoña","Bilbao","Boadilla del Monte","Boadilla Pueblo","Buenos Aires",
    "Callao","Campamento","Canal","Canillejas","Canillas","Cantoblanco Universidad",
    "Carabanchel","Carpetana","Casa de Campo","Ciudad de la Imagen","Ciudad Jardín",
    "Ciudad Lineal","Ciudad Universitaria","Colombia","Colonia Jardín","Conde de Casal",
    "Congosto","Conservatorio","Coslada Central","Cuatro Caminos","Cuatro Vientos","Cuzco",
    "Delicias","Diego de León","Duque de Pastrana",
    "El Bercial","El Casar","Empalme","Embajadores","Esperanza",
    "Estadio Metropolitano","Estadio Olímpico","Estrecho","Eugenia de Montijo",
    "Fuencarral","Fuenlabrada Central",
    "García Noblejas","Goya","Gran Vía","Gregorio Marañón","Guzmán el Bueno",
    "Henares","Herrera Oria","Hospital de Móstoles","Hospital del Henares",
    "Hospital Infanta Sofía","Hortaleza","Ibiza","Iglesia",
    "Jarama","Joaquín Vilumbrales",
    "La Fortuna","La Gavia","La Granja","La Latina","La Peseta","La Poveda",
    "Lacoma","Lago","Laguna","Las Musas","Las Rozas","Las Rosas","Las Tablas",
    "Lavapiés","Leganés Central","Legazpi","Lista","Loranca",
    "Manuel Becerra","Manoteras","Mar de Cristal","Marqués de Vadillo",
    "Méndez Álvaro","Menéndez Pelayo","Miguel Hernández","Mirasierra",
    "Moncloa","Montalbán","Montecarmelo","Móstoles Central",
    "Noviciado","Nueva Numancia","Nuevos Ministerios","Núñez de Balboa",
    "O'Donnell","Opañel","Ópera","Oporto",
    "Paco de Lucía","Pacífico","Palos de la Frontera","Parque de Santa María",
    "Parque Lisboa","Parque Oeste","Pavones","Perales del Río",
    "Pinar de Chamartín","Pinar del Rey","Pitis","Plaza de Castilla",
    "Plaza de España","Plaza Elíptica","Portazgo","Pozuelo","Pradillo",
    "Pradolongo","Príncipe de Vergara","Príncipe Pío","Prosperidad",
    "Pueblo Nuevo","Puente de Vallecas","Puerta de Arganda","Puerta de Toledo","Puerta del Sur",
    "Quintana","Quevedo",
    "Ramón y Cajal","Retiro","Reyes Católicos","Río","Ríos Rosas",
    "Rivas Urbanizaciones","Rivas Vaciamadrid","Ronda de la Comunicación","Rubén Darío",
    "Sainz de Baranda","San Bernardo","San Cristóbal Industrial","San Fernando",
    "San José de Valderas","Sanchinarro","Santo Domingo","Serrano","Sevilla",
    "Sierra de Guadalupe","Sol","Suanzes",
    "Tetuán","Tirso de Molina","Torre Arias","Tres Olivos","Tribunal",
    "Urgel","Valdeacederas","Valdecarros","Valdebernardo","Ventas",
    "Ventura Rodríguez","Vicálvaro","Villa de Vallecas","Villaverde Alto",
    "Vinateros","Virgen de Begoña","Vista Alegre",
]

def _normalizar(s):
    """Normaliza texto para comparación."""
    import unicodedata
    s = s.lower().strip()
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return s

def _buscar_estacion(nombre_raw: str) -> str | None:
    """Busca la estación más similar en la lista oficial."""
    if not nombre_raw:
        return None
    nombre_norm = _normalizar(nombre_raw)
    estaciones_norm = [_normalizar(e) for e in ESTACIONES]

    # Coincidencia exacta normalizada
    for i, e in enumerate(estaciones_norm):
        if nombre_norm == e:
            return ESTACIONES[i]

    # Coincidencia por contenido (el nombre extraído está dentro del oficial o viceversa)
    for i, e in enumerate(estaciones_norm):
        if nombre_norm in e or e in nombre_norm:
            return ESTACIONES[i]

    # Fuzzy matching como último recurso
    matches = difflib.get_close_matches(nombre_norm, estaciones_norm, n=1, cutoff=0.6)
    if matches:
        idx = estaciones_norm.index(matches[0])
        return ESTACIONES[idx]

    return None


def _extract_text(content: bytes) -> str:
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(content))
        return "\n".join(p.extract_text() or "" for p in reader.pages)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"No se pudo leer el PDF: {e}")


def _parse(text: str) -> dict:
    result = {}

    # OT
    m = re.search(r'N[º°o]\s*de\s*ST:\s*(\d+)', text, re.IGNORECASE)
    if m:
        result["ot"] = m.group(1)

    # Tipo
    if re.search(r'\bCORRECTIVO\b', text, re.IGNORECASE):
        result["tipo"] = "Correctivo"
    elif re.search(r'\bPREVENTIVO\b', text, re.IGNORECASE):
        result["tipo"] = "Preventivo"

    # Prioridad base
    m = re.search(r'Prioridad:\s*(Alta|Media|Baja)', text, re.IGNORECASE)
    if m:
        result["prioridad"] = m.group(1).capitalize()

    # Prioridad por equipo
    m_infn = re.search(r'INFN_\S+', text, re.IGNORECASE)
    if m_infn:
        nombre_eq = m_infn.group(0).upper()
        result["prioridad"] = "Media" if ("PMR" in nombre_eq or "ASC" in nombre_eq) else "Baja"

    # Equipo
    m = re.search(r'Equipo:\s*(0IF\S+)', text, re.IGNORECASE)
    if m:
        result["equipo_afectado"] = m.group(1)

    # Fecha alta
    m = re.search(r'Fecha Alta:\s*(\d{2})\.(\d{2})\.(\d{4})\s*/\s*(\d{2}:\d{2})', text)
    if m:
        result["fecha_hora"] = f"{m.group(1)}/{m.group(2)}/{m.group(3)} {m.group(4)}"

    # Estación — intenta primero V.ÚNICO(NOMBRE)
    estacion_raw = None
    m_est = re.search(r'Descripci[oó]n:\s*\*?V\.ÚNICO\(([^)]+)\)', text, re.IGNORECASE)
    if m_est:
        estacion_raw = m_est.group(1).strip()
    else:
        # Formato: "E.NOMBRE" — captura hasta "Equipo" o fin de línea
        m_est2 = re.search(
            r'Descripci[oó]n:[^\n]*?\bE\.([A-ZÁÉÍÓÚÑ][^\n]*?)(?=\s+Equipo|\s{2,}|\s+INFN|\s+0IF|\n|$)',
            text, re.IGNORECASE
        )
        if m_est2:
            estacion_raw = m_est2.group(1).strip()
            estacion_raw = re.sub(r'\s+', ' ', estacion_raw).strip()

    if estacion_raw:
        # Buscar coincidencia en lista oficial
        estacion_oficial = _buscar_estacion(estacion_raw)
        result["estacion"] = estacion_oficial if estacion_oficial else estacion_raw.title()

    # Zona
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

    # Descripción fallo
    m = re.search(r'OBSERVACIONES\n(.+?)(?=\nULTIMOS|\nFIRMA|$)', text, re.DOTALL | re.IGNORECASE)
    if m:
        obs = m.group(1).strip()
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