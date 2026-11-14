import os
import pptx
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml import parse_xml

def create_deck(output_paths):
    prs = pptx.Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Paleta de colores exacta de la plantilla Slidesgo
    C_BG = RGBColor(227, 244, 250)          # #E3F4FA Fondo azul hielo médico exacto del template
    C_WHITE = RGBColor(255, 255, 255)       # Blanco puro
    C_NAVY = RGBColor(4, 24, 52)            # #041834 Azul marino profundo para texto y contraste
    C_OCEAN = RGBColor(0, 100, 143)         # #00648F Azul océano médico
    C_CYAN = RGBColor(5, 150, 162)          # #0596A2 Turquesa clínico
    C_CYAN_BG = RGBColor(227, 244, 250)     # #E3F4FA Fondo tarjetas claras
    C_CORAL = RGBColor(226, 88, 62)         # #E2583E Coral / Salmón vivo (acento del template)
    C_CORAL_BG = RGBColor(254, 237, 233)    # #FEEDE9 Fondo suave coral
    C_MUTED = RGBColor(100, 125, 145)       # #647D91 Texto secundario
    C_BORDER = RGBColor(214, 230, 240)      # Borde sutil
    C_BORDER_DARK = RGBColor(180, 205, 220)
    C_EMERALD = RGBColor(16, 149, 106)
    C_EMERALD_BG = RGBColor(230, 249, 241)

    template_dir = os.path.abspath(r'NextGen-Health\docs\clean_templates')
    bg1_path = os.path.join(template_dir, 'bg_slide_1.png')
    bg2_path = os.path.join(template_dir, 'bg_slide_2_contexto.png')
    bg3_path = os.path.join(template_dir, 'bg_slide_3_roles.png')
    bg4_path = os.path.join(template_dir, 'bg_slide_4_roadmap.png')
    bg5_path = os.path.join(template_dir, 'bg_slide_5_preguntas.png')
    diagram_path = os.path.abspath(r'NextGen-Health\docs\diagrama_flujo_idea.png')

    def set_slide_transition(slide, trans_type="fade"):
        xml = f'<p:transition xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" spd="med"><p:{trans_type}/></p:transition>'
        try:
            slide._element.append(parse_xml(xml))
        except Exception:
            pass

    def apply_template_background(slide, bg_image_path):
        if os.path.exists(bg_image_path):
            slide.shapes.add_picture(bg_image_path, 0, 0, width=Inches(13.333), height=Inches(7.5))
        else:
            bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
            bg.fill.solid()
            bg.fill.fore_color.rgb = C_BG
            bg.line.fill.background()

    def add_pill_badge(slide, left, top, width, height, text, bg_color=C_CORAL, text_color=C_WHITE, font_size=10):
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
        shape.fill.solid()
        shape.fill.fore_color.rgb = bg_color
        shape.line.fill.background()
        tf = shape.text_frame
        tf.word_wrap = False
        p = tf.paragraphs[0]
        p.text = text
        p.font.size = Pt(font_size)
        p.font.bold = True
        p.font.color.rgb = text_color
        p.font.name = "Segoe UI"
        p.alignment = PP_ALIGN.CENTER
        return shape

    def add_card(slide, left, top, width, height, bg_color=C_WHITE, border_color=C_BORDER):
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(left), Inches(top), Inches(width), Inches(height))
        shape.fill.solid()
        shape.fill.fore_color.rgb = bg_color
        if border_color:
            shape.line.color.rgb = border_color
            shape.line.width = Pt(1.2)
        else:
            shape.line.fill.background()
        return shape

    def add_header(slide, tag_text, title_text, subtitle_text, slide_num="02"):
        # Tracker derecho
        tr_box = slide.shapes.add_textbox(Inches(8.5), Inches(0.4), Inches(4.0), Inches(0.35))
        tf_tr = tr_box.text_frame
        p_tr = tf_tr.paragraphs[0]
        p_tr.text = f"GRUPO 33 // CP1 // {slide_num}/06"
        p_tr.font.size = Pt(9.5)
        p_tr.font.bold = True
        p_tr.font.color.rgb = C_OCEAN
        p_tr.font.name = "Segoe UI"
        p_tr.alignment = PP_ALIGN.RIGHT

        # Tag de categoría
        tag_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.38), Inches(7.5), Inches(0.35))
        tf_tag = tag_box.text_frame
        p_tag = tf_tag.paragraphs[0]
        p_tag.text = tag_text.upper()
        p_tag.font.size = Pt(10)
        p_tag.font.bold = True
        p_tag.font.color.rgb = C_CORAL
        p_tag.font.name = "Segoe UI"

        # Título
        t_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.72), Inches(11.7), Inches(0.55))
        tf_t = t_box.text_frame
        tf_t.word_wrap = True
        p_t = tf_t.paragraphs[0]
        p_t.text = title_text
        p_t.font.size = Pt(22)
        p_t.font.bold = True
        p_t.font.color.rgb = C_NAVY
        p_t.font.name = "Segoe UI"

        # Subtítulo explicativo
        s_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.30), Inches(11.7), Inches(0.45))
        tf_s = s_box.text_frame
        tf_s.word_wrap = True
        p_s = tf_s.paragraphs[0]
        p_s.text = subtitle_text
        p_s.font.size = Pt(11)
        p_s.font.color.rgb = C_MUTED
        p_s.font.name = "Segoe UI"

    # =========================================================================
    # SLIDE 1: PORTADA OFICIAL GRUPO 33
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    apply_template_background(s1, bg1_path)
    set_slide_transition(s1, "fade")

    # Tarjeta de contexto en la parte inferior izquierda de la portada
    card_p1 = add_card(s1, 0.85, 4.6, 6.6, 2.3, bg_color=C_WHITE, border_color=C_BORDER)

    t_p1 = s1.shapes.add_textbox(Inches(1.0), Inches(4.7), Inches(6.3), Inches(2.1))
    tf_p1 = t_p1.text_frame
    tf_p1.word_wrap = True

    p = tf_p1.paragraphs[0]
    p.text = "8ª EDICIÓN HACKATHON BOEHRINGER INGELHEIM"
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = C_CORAL
    p.font.name = "Segoe UI"

    p_reto = tf_p1.add_paragraph()
    p_reto.text = "Reto 1: Automatizar lo repetitivo — Detectar el riesgo silente sin añadir burocracia en consulta"
    p_reto.font.size = Pt(11)
    p_reto.font.bold = True
    p_reto.font.color.rgb = C_NAVY

    p_sp = tf_p1.add_paragraph()
    p_sp.text = ""

    p_eq = tf_p1.add_paragraph()
    p_eq.text = "EQUIPO DEL PROYECTO (GRUPO 33):"
    p_eq.font.size = Pt(9.5)
    p_eq.font.bold = True
    p_eq.font.color.rgb = C_OCEAN

    team_members = [
        ("Juan Torrero", "Backend & Servicios API"),
        ("Cuntin (Alejandro)", "Modelo y Datos (Machine Learning & KDIGO)"),
        ("Adrián Hernando", "Frontend en React (Interfaz de Usuario)")
    ]
    for name, role in team_members:
        p_m = tf_p1.add_paragraph()
        p_m.text = f"• {name}: "
        p_m.font.size = Pt(10)
        p_m.font.bold = True
        p_m.font.color.rgb = C_NAVY
        r = p_m.add_run()
        r.text = role
        r.font.bold = False
        r.font.color.rgb = C_MUTED

    # =========================================================================
    # SLIDE 2: EL PROBLEMA EN ATENCIÓN PRIMARIA
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    apply_template_background(s2, bg2_path)
    set_slide_transition(s2, "push")
    add_header(s2, "Contexto Clínico & Reto", "El Reto Clínico: Detección Precoz sin Carga Operativa", "En consulta no falta información médica: falta tiempo material para cruzar datos y ver tendencias silenciosas.", "02")

    w_left = 6.8
    # Tarjeta 1: La Realidad de Carmen
    add_card(s2, 0.8, 1.9, w_left, 1.35, bg_color=C_WHITE, border_color=C_BORDER)
    add_pill_badge(s2, 1.0, 2.05, 2.1, 0.28, "EL DÍA A DÍA DE CARMEN", bg_color=C_CORAL, text_color=C_WHITE, font_size=9)
    t_c1 = s2.shapes.add_textbox(Inches(1.0), Inches(2.35), Inches(w_left - 0.4), Inches(0.85))
    tf_c1 = t_c1.text_frame
    tf_c1.word_wrap = True
    p1 = tf_c1.paragraphs[0]
    p1.text = "• 6 minutos por paciente en Atención Primaria y más de 30 consultas diarias."
    p1.font.size = Pt(9.8)
    p1.font.color.rgb = C_NAVY
    p1_sub = tf_c1.add_paragraph()
    p1_sub.text = "• Cero tiempo para abrir calculadoras externas o teclear 10 variables a mano en cada cita."
    p1_sub.font.size = Pt(9.8)
    p1_sub.font.color.rgb = C_MUTED

    # Tarjeta 2: La Trampa de la Analítica "Normal"
    add_card(s2, 0.8, 3.4, w_left, 1.45, bg_color=C_WHITE, border_color=C_CORAL)
    add_pill_badge(s2, 1.0, 3.55, 2.4, 0.28, "LA TRAMPA DEL RANGO NORMAL", bg_color=C_CORAL, text_color=C_WHITE, font_size=9)
    t_c2 = s2.shapes.add_textbox(Inches(1.0), Inches(3.85), Inches(w_left - 0.4), Inches(0.95))
    tf_c2 = t_c2.text_frame
    tf_c2.word_wrap = True
    p2 = tf_c2.paragraphs[0]
    p2.text = "• Paciente con filtrado glomerular (eGFR) en 68 mL/min y microalbuminuria (UACR) en 35 mg/g."
    p2.font.size = Pt(9.8)
    p2.font.bold = True
    p2.font.color.rgb = C_NAVY
    p2_sub = tf_c2.add_paragraph()
    p2_sub.text = "• Como no salta asterisco rojo en el informe, nadie nota que hace 12 meses tenía eGFR 84. Está perdiendo riñón y corazón de forma silenciosa hasta que el evento cardiovascular ya es irreversible."
    p2_sub.font.size = Pt(9.5)
    p2_sub.font.color.rgb = C_MUTED

    # Tarjeta 3: Propuesta NextGen Health
    add_card(s2, 0.8, 5.0, w_left, 1.75, bg_color=C_CYAN_BG, border_color=C_CYAN)
    add_pill_badge(s2, 1.0, 5.15, 2.5, 0.28, "PROPUESTA: SEGUNDA OPINIÓN EN 1 CLIC", bg_color=C_CYAN, text_color=C_WHITE, font_size=9)
    t_c3 = s2.shapes.add_textbox(Inches(1.0), Inches(5.45), Inches(w_left - 0.4), Inches(1.2))
    tf_c3 = t_c3.text_frame
    tf_c3.word_wrap = True
    p3 = tf_c3.paragraphs[0]
    p3.text = "• Cruce automático de analíticas en segundo plano sin teclear datos (0 clics de carga)."
    p3.font.size = Pt(9.8)
    p3.font.color.rgb = C_NAVY
    p3_1 = tf_c3.add_paragraph()
    p3_1.text = "• Evaluación Dual: Modo Foto Fija (valores actuales) vs Modo Progresión temporal (Δ anual)."
    p3_1.font.size = Pt(9.8)
    p3_1.font.color.rgb = C_NAVY
    p3_2 = tf_c3.add_paragraph()
    p3_2.text = "• 3 Fenotipos Clínicos (Aterosclerosis, IC y Cardiorrenal) con regla antifatiga de alertas."
    p3_2.font.size = Pt(9.8)
    p3_2.font.color.rgb = C_OCEAN

    # =========================================================================
    # SLIDE 3: LA IDEA — ARQUITECTURA TÉCNICA Y FLUJO DE LA SOLUCIÓN
    # (CON EL DIAGRAMA DE FLUJO OFICIAL APORTADO POR EL USUARIO)
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    apply_template_background(s3, bg3_path)
    set_slide_transition(s3, "push")
    add_header(s3, "Propuesta de Solución", "La Idea: Arquitectura Técnica y Flujo de la Solución", "Flujo completo de extremo a extremo: desde el entrenamiento offline hasta la inferencia en 1 clic y explicación SHAP.", "03")

    # Contenedor del Diagrama en el lado izquierdo
    diag_card = add_card(s3, 0.8, 1.85, 8.55, 5.15, bg_color=C_WHITE, border_color=C_BORDER)
    if os.path.exists(diagram_path):
        s3.shapes.add_picture(diagram_path, Inches(0.9), Inches(1.95), width=Inches(8.35))

    # Columna Derecha con las 3 Claves del Flujo Técnico
    info_w = 3.0
    info_left = 9.55

    # Clave 1: Cuntin (Modelo Offline)
    add_card(s3, info_left, 1.85, info_w, 1.6, bg_color=C_WHITE, border_color=C_BORDER)
    add_pill_badge(s3, info_left + 0.15, 1.98, 2.2, 0.26, "1. ENTRENAMIENTO OFFLINE", bg_color=C_OCEAN, text_color=C_WHITE, font_size=8.5)
    t_k1 = s3.shapes.add_textbox(Inches(info_left + 0.12), Inches(2.28), Inches(info_w - 0.24), Inches(1.1))
    tf_k1 = t_k1.text_frame
    tf_k1.word_wrap = True
    p = tf_k1.paragraphs[0]
    p.text = "Cuntin (Modelo y Datos)"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_NAVY
    p_desc = tf_k1.add_paragraph()
    p_desc.text = "XGBoost entrenado con NutriSynthCare + Kaggle (70k) y persistido con Joblib. Listo para inferencia inmediata sin latencia."
    p_desc.font.size = Pt(8.8)
    p_desc.font.color.rgb = C_MUTED

    # Clave 2: Juan (Lógica Dual & API)
    add_card(s3, info_left, 3.6, info_w, 1.6, bg_color=C_WHITE, border_color=C_BORDER)
    add_pill_badge(s3, info_left + 0.15, 3.73, 2.2, 0.26, "2. DECISIÓN DUAL A / B", bg_color=C_CORAL, text_color=C_WHITE, font_size=8.5)
    t_k2 = s3.shapes.add_textbox(Inches(info_left + 0.12), Inches(4.03), Inches(info_w - 0.24), Inches(1.1))
    tf_k2 = t_k2.text_frame
    tf_k2.word_wrap = True
    p = tf_k2.paragraphs[0]
    p.text = "Juan (Backend & API)"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_NAVY
    p_desc2 = tf_k2.add_paragraph()
    p_desc2.text = "FastAPI valida y decide: Modo A (Foto fija si es nuevo) o Modo B (Evolución si hay analítica previa). Soporte nativo de nulos."
    p_desc2.font.size = Pt(8.8)
    p_desc2.font.color.rgb = C_MUTED

    # Clave 3: Adrián (Interfaz & SHAP)
    add_card(s3, info_left, 5.35, info_w, 1.65, bg_color=C_CYAN_BG, border_color=C_CYAN)
    add_pill_badge(s3, info_left + 0.15, 5.48, 2.3, 0.26, "3. EXPLICACIÓN EN PANTALLA", bg_color=C_CYAN, text_color=C_WHITE, font_size=8.5)
    t_k3 = s3.shapes.add_textbox(Inches(info_left + 0.12), Inches(5.78), Inches(info_w - 0.24), Inches(1.15))
    tf_k3 = t_k3.text_frame
    tf_k3.word_wrap = True
    p = tf_k3.paragraphs[0]
    p.text = "Adrián (Frontend / Interfaz)"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = C_NAVY
    p_desc3 = tf_k3.add_paragraph()
    p_desc3.text = "Cero caja negra: SHAP desglosa los factores de riesgo con gráficas Recharts para que el médico confíe y tome la acción preventiva."
    p_desc3.font.size = Pt(8.8)
    p_desc3.font.color.rgb = C_OCEAN

    # =========================================================================
    # SLIDE 4: ORGANIZACIÓN DEL EQUIPO — ROLES CLAROS (NÚCLEO CHECKPOINT 1)
    # (JUAN: BACKEND // CUNTIN: MODELO Y DATOS // ADRIÁN: FRONTEND EN REACT)
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    apply_template_background(s4, bg3_path)
    set_slide_transition(s4, "push")
    add_header(s4, "Criterio Oficial Checkpoint 1", "Organización del Equipo: Tres Pilares Técnicos Coordinados", "División funcional estricta en Backend, Modelo y Frontend para garantizar solvencia técnica y entrega en 48 horas.", "04")

    col_w = 3.65
    gap = 0.39

    # Columna 1: Backend (Juan Torrero)
    c1_left = 0.8
    add_card(s4, c1_left, 1.9, col_w, 4.4, bg_color=C_WHITE, border_color=C_BORDER)
    add_pill_badge(s4, c1_left + 0.2, 2.05, 1.8, 0.32, "01 • BACKEND & API", bg_color=C_CORAL, text_color=C_WHITE, font_size=10)

    t_b1 = s4.shapes.add_textbox(Inches(c1_left + 0.2), Inches(2.45), Inches(col_w - 0.4), Inches(3.7))
    tf_b1 = t_b1.text_frame
    tf_b1.word_wrap = True

    p = tf_b1.paragraphs[0]
    p.text = "Juan Torrero"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_NAVY

    p_sub = tf_b1.add_paragraph()
    p_sub.text = "Líder de Backend & Servicios API"
    p_sub.font.size = Pt(11)
    p_sub.font.bold = True
    p_sub.font.color.rgb = C_CORAL

    p_sp = tf_b1.add_paragraph()
    p_sp.text = ""

    bullets_juan = [
        ("FastAPI Asíncrono:", "Arquitectura RESTful con validación Pydantic v2 y alta concurrencia."),
        ("Ingesta de Carpeta en 1 Clic:", "Lectura directa de analíticas en data/analiticas/ sin base de datos pesada."),
        ("Endpoints del Sistema:", "Rutas /predict y /analiticas de respuesta en milisegundos."),
        ("Orquestación de Inferencia:", "Conexión ágil entre peticiones del frontend y el motor de predicción."),
        ("Generador de Recomendaciones:", "Lógica clínica para transformar causas raíz en pautas preventivas.")
    ]
    for idx, (tit, desc) in enumerate(bullets_juan):
        p_it = tf_b1.add_paragraph()
        p_it.text = f"• {tit} "
        p_it.font.size = Pt(9.8)
        p_it.font.bold = True
        p_it.font.color.rgb = C_NAVY
        run = p_it.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = C_MUTED

    # Columna 2: Modelo y Datos (Cuntin)
    c2_left = c1_left + col_w + gap
    add_card(s4, c2_left, 1.9, col_w, 4.4, bg_color=C_WHITE, border_color=C_BORDER)
    add_pill_badge(s4, c2_left + 0.2, 2.05, 2.0, 0.32, "02 • MODELO Y DATOS", bg_color=C_OCEAN, text_color=C_WHITE, font_size=10)

    t_b2 = s4.shapes.add_textbox(Inches(c2_left + 0.2), Inches(2.45), Inches(col_w - 0.4), Inches(3.7))
    tf_b2 = t_b2.text_frame
    tf_b2.word_wrap = True

    p = tf_b2.paragraphs[0]
    p.text = "Cuntin (Alejandro)"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_NAVY

    p_sub = tf_b2.add_paragraph()
    p_sub.text = "Líder de Datos y Machine Learning"
    p_sub.font.size = Pt(11)
    p_sub.font.bold = True
    p_sub.font.color.rgb = C_OCEAN

    p_sp = tf_b2.add_paragraph()
    p_sp.text = ""

    bullets_cuntin = [
        ("Datos España (NutriSynthCare):", "Distribuciones de diabetes, tensión y factores de riesgo del SNS."),
        ("Base Masiva (70k Pacientes):", "Volumen estadístico para calibrar interacciones biomédicas no lineales."),
        ("Fisiopatología Renal (KDIGO):", "Modelado continuo de eGFR y albuminuria (UACR) y deltas temporales."),
        ("XGBoost con Nulos Nativos:", "Configuración missing=np.nan para cuando no hay orina reciente sin fallar."),
        ("Recall Clínico & SHAP (XAI):", "Sensibilidad ≥ 85% y desglose porcentual de impacto por variable.")
    ]
    for idx, (tit, desc) in enumerate(bullets_cuntin):
        p_it = tf_b2.add_paragraph()
        p_it.text = f"• {tit} "
        p_it.font.size = Pt(9.8)
        p_it.font.bold = True
        p_it.font.color.rgb = C_NAVY
        run = p_it.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = C_MUTED

    # Columna 3: Frontend / Interfaz (Adrián Hernando)
    c3_left = c2_left + col_w + gap
    add_card(s4, c3_left, 1.9, col_w, 4.4, bg_color=C_WHITE, border_color=C_BORDER)
    add_pill_badge(s4, c3_left + 0.2, 2.05, 2.1, 0.32, "03 • FRONTEND / INTERFAZ", bg_color=C_CYAN, text_color=C_WHITE, font_size=10)

    t_b3 = s4.shapes.add_textbox(Inches(c3_left + 0.2), Inches(2.45), Inches(col_w - 0.4), Inches(3.7))
    tf_b3 = t_b3.text_frame
    tf_b3.word_wrap = True

    p = tf_b3.paragraphs[0]
    p.text = "Adrián Hernando"
    p.font.size = Pt(16)
    p.font.bold = True
    p.font.color.rgb = C_NAVY

    p_sub = tf_b3.add_paragraph()
    p_sub.text = "Líder de Producto, Frontend & UI"
    p_sub.font.size = Pt(11)
    p_sub.font.bold = True
    p_sub.font.color.rgb = C_CYAN

    p_sp = tf_b3.add_paragraph()
    p_sp.text = ""

    bullets_adrian = [
        ("Diseño Centrado en Carmen:", "Experiencia adaptada a los 6 minutos de consulta médica (cero tecleo)."),
        ("Dashboard React 18 + Tailwind:", "Interfaz interactiva completa ya prototipada en app/frontend/index.html."),
        ("Cupo Diario en 1 Clic:", "Pestaña de lote con badge de riesgo y emisión inmediata de volante de orina."),
        ("Simulador Dual Interactivo:", "Modo laboratorio con sliders para demostración en vivo ante el jurado."),
        ("Visualización con Recharts:", "Radar de 3 fenotipos y barras de factores de impacto explicados por SHAP.")
    ]
    for idx, (tit, desc) in enumerate(bullets_adrian):
        p_it = tf_b3.add_paragraph()
        p_it.text = f"• {tit} "
        p_it.font.size = Pt(9.8)
        p_it.font.bold = True
        p_it.font.color.rgb = C_NAVY
        run = p_it.add_run()
        run.text = desc
        run.font.bold = False
        run.font.color.rgb = C_MUTED

    # Banner inferior
    banner = add_card(s4, 0.8, 6.45, 11.7, 0.55, bg_color=C_CYAN_BG, border_color=C_BORDER)
    t_ban = s4.shapes.add_textbox(Inches(1.0), Inches(6.5), Inches(11.3), Inches(0.45))
    tf_ban = t_ban.text_frame
    p_ban = tf_ban.paragraphs[0]
    p_ban.text = "FLUJO TÉCNICO COORDINADO:  "
    p_ban.font.size = Pt(10)
    p_ban.font.bold = True
    p_ban.font.color.rgb = C_OCEAN
    p_ban.font.name = "Segoe UI"
    r1 = p_ban.add_run()
    r1.text = "Ingesta & API (Juan Torrero)  ➔  Modelo Predictivo & SHAP (Cuntin)  ➔  Decisión en Pantalla (Adrián Hernando)"
    r1.font.bold = False
    r1.font.color.rgb = C_NAVY

    # =========================================================================
    # SLIDE 5: PLAN DE TRABAJO COORDINADO (CRONOGRAMA DE 48 HORAS)
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    apply_template_background(s5, bg4_path)
    set_slide_transition(s5, "push")
    add_header(s5, "Criterio Oficial Checkpoint 1", "Plan de Trabajo Coordinado: Cronograma de 48 Horas", "Hitos concretos y medibles por fases para llegar con solvencia técnica a la entrega del domingo a las 14:45h.", "05")

    w_step = 2.7
    hitos = [
        ("PASO 01", "Cimientos & Roles", "Viernes Noche - Sáb 11:30", "COMPLETADO (CP1)", C_EMERALD, [
            "Organización del equipo cerrada (Juan, Cuntin, Adrián).",
            "Especificación técnica y arquitectura dual aprobadas.",
            "Contratos de API REST definidos con Pydantic v2.",
            "Prototipo de interfaz asistida ya funcional en React/HTML."
        ]),
        ("PASO 02", "Motor ML & API", "Sábado 12:00 - 18:00", "EN CURSO (Hacia CP2)", C_OCEAN, [
            "Script de síntesis y enriquecimiento de datos clínicos.",
            "Entrenamiento de XGBoost optimizando Recall ≥ 85%.",
            "Cálculo de matrices SHAP y exportación .joblib.",
            "Endpoints FastAPI (/predict, /analiticas) listos en local."
        ]),
        ("PASO 03", "Integración Total", "Sábado 18:30 - Dom 11:30", "PENDIENTE", C_CYAN, [
            "Conexión completa de la interfaz React con FastAPI.",
            "Pruebas de estrés con analíticas incompletas (nulos de orina).",
            "Afinado de recomendaciones preventivas guiadas.",
            "Incorporación del feedback del jurado de CP1 y CP2."
        ]),
        ("PASO 04", "Entrega & Pitch", "Domingo 12:00 - 14:45", "PENDIENTE (Top 8)", C_NAVY, [
            "Congelación final del repositorio antes de las 14:45h.",
            "Ensayo del pitch clínico de 5 minutos y demo en vivo.",
            "Comprobación técnica de cámara y entorno en SoWork.",
            "Defensa final ante el tribunal de Boehringer Ingelheim."
        ])
    ]

    line_tl = s5.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.5), Inches(2.35), Inches(10.3), Inches(0.06))
    line_tl.fill.solid()
    line_tl.fill.fore_color.rgb = C_BORDER_DARK
    line_tl.line.fill.background()

    for idx, (step_num, titulo, horario, estado, color_st, tareas) in enumerate(hitos):
        left_pos = 0.8 + idx * 2.95
        add_card(s5, left_pos, 2.0, w_step, 4.8, bg_color=C_WHITE, border_color=C_BORDER)

        add_pill_badge(s5, left_pos + 0.15, 2.12, 1.2, 0.28, step_num, bg_color=color_st, text_color=C_WHITE, font_size=9)

        t_h = s5.shapes.add_textbox(Inches(left_pos + 0.12), Inches(2.45), Inches(w_step - 0.24), Inches(0.6))
        p_th = t_h.text_frame.paragraphs[0]
        p_th.text = titulo
        p_th.font.size = Pt(13)
        p_th.font.bold = True
        p_th.font.color.rgb = C_NAVY

        t_body = s5.shapes.add_textbox(Inches(left_pos + 0.12), Inches(3.05), Inches(w_step - 0.24), Inches(3.6))
        tf_b = t_body.text_frame
        tf_b.word_wrap = True

        p_time = tf_b.paragraphs[0]
        p_time.text = horario
        p_time.font.size = Pt(9.5)
        p_time.font.bold = True
        p_time.font.color.rgb = C_MUTED

        p_badge = tf_b.add_paragraph()
        p_badge.text = f"Estado: {estado}"
        p_badge.font.size = Pt(9.5)
        p_badge.font.bold = True
        p_badge.font.color.rgb = color_st

        p_sp = tf_b.add_paragraph()
        p_sp.text = ""

        for tar in tareas:
            p_tar = tf_b.add_paragraph()
            p_tar.text = f"• {tar}"
            p_tar.font.size = Pt(9.5)
            p_tar.font.color.rgb = C_NAVY

    # =========================================================================
    # SLIDE 6: PREGUNTAS ESTRATÉGICAS AL JURADO
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    apply_template_background(s6, bg5_path)
    set_slide_transition(s6, "fade")
    add_header(s6, "Validación y Feedback del Tribunal", "Preguntas Clave para el Jurado en este Checkpoint 1", "Aprovechamos estos 15 minutos para contrastar nuestras decisiones clínicas y técnicas con su experiencia.", "06")

    # Pregunta 1
    add_card(s6, 0.8, 1.95, 11.7, 1.45, bg_color=C_WHITE, border_color=C_OCEAN)
    add_pill_badge(s6, 1.0, 2.1, 2.6, 0.28, "1. ENFOQUE CLÍNICO CARDIORRENAL", bg_color=C_OCEAN, text_color=C_WHITE, font_size=9)
    t_q1 = s6.shapes.add_textbox(Inches(1.0), Inches(2.42), Inches(11.3), Inches(0.9))
    tf_q1 = t_q1.text_frame
    tf_q1.word_wrap = True
    p1 = tf_q1.paragraphs[0]
    p1.text = "«Hemos estructurado la salida en 3 fenotipos (Aterosclerosis, Insuficiencia Cardíaca y Cardiorrenal), prestando especial atención a la caída interanual de la función renal (ΔeGFR / ΔUACR). Desde su experiencia médica en Boehringer, ¿ven acertado priorizar esta velocidad de caída renal sobre scores ateroscleróticos tradicionales en Atención Primaria?»"
    p1.font.size = Pt(11)
    p1.font.color.rgb = C_NAVY

    # Pregunta 2
    add_card(s6, 0.8, 3.6, 11.7, 1.45, bg_color=C_WHITE, border_color=C_CYAN)
    add_pill_badge(s6, 1.0, 3.75, 2.6, 0.28, "2. ADOPCIÓN REAL EN ATENCIÓN PRIMARIA", bg_color=C_CYAN, text_color=C_WHITE, font_size=9)
    t_q2 = s6.shapes.add_textbox(Inches(1.0), Inches(4.07), Inches(11.3), Inches(0.9))
    tf_q2 = t_q2.text_frame
    tf_q2.word_wrap = True
    p2 = tf_q2.paragraphs[0]
    p2.text = "«Para cumplir con 'automatizar lo repetitivo' sin robarle tiempo a Carmen, diseñamos el análisis directo de la carpeta de analíticas en 1 solo clic (dejando el simulador manual como demo). ¿Coinciden en que eliminar por completo el tecleo de datos es la clave para que esta solución se adopte de verdad en el SNS?»"
    p2.font.size = Pt(11)
    p2.font.color.rgb = C_NAVY

    # Pregunta 3
    add_card(s6, 0.8, 5.25, 11.7, 1.45, bg_color=C_WHITE, border_color=C_CORAL)
    add_pill_badge(s6, 1.0, 5.4, 2.8, 0.28, "3. CRITERIO TÉCNICO: RECALL VS EXPLICABILIDAD", bg_color=C_CORAL, text_color=C_WHITE, font_size=9)
    t_q3 = s6.shapes.add_textbox(Inches(1.0), Inches(5.72), Inches(11.3), Inches(0.9))
    tf_q3 = t_q3.text_frame
    tf_q3.word_wrap = True
    p3 = tf_q3.paragraphs[0]
    p3.text = "«Hemos priorizado un Recall alto (≥ 85%) para erradicar falsos negativos silenciosos e integrado SHAP para desglosar en pantalla el impacto de cada parámetro. De cara a los siguientes checkpoints, ¿qué balance valora más el jurado: la optimización pura del clasificador o la claridad de la justificación médica en la interfaz?»"
    p3.font.size = Pt(11)
    p3.font.color.rgb = C_NAVY

    for p_out in output_paths:
        os.makedirs(os.path.dirname(p_out), exist_ok=True)
        try:
            prs.save(p_out)
            print(f"Presentación actualizada exitosamente en: {p_out}")
        except PermissionError:
            alt_path = p_out.replace(".pptx", "_actualizada.pptx")
            try:
                prs.save(alt_path)
                print(f"[AVISO] '{p_out}' está abierto en PowerPoint. Se guardó como: {alt_path}")
            except Exception as e:
                print(f"[ERROR] No se pudo guardar ni en {p_out} ni en {alt_path}: {e}")
        except Exception as e:
            print(f"[ERROR] Falló al guardar en {p_out}: {e}")

if __name__ == '__main__':
    paths = [
        r'c:\Users\USUARIO\Desktop\HACKATHON\NextGen-Health\docs\Presentacion_Checkpoint1_NextGenHealth.pptx',
        r'c:\Users\USUARIO\Desktop\HACKATHON\Presentacion_Checkpoint1_NextGenHealth.pptx',
        r'c:\Users\USUARIO\Desktop\HACKATHON\Presentacion_Checkpoint1_NextGenHealth_actualizada.pptx',
        r'C:\Users\USUARIO\.gemini\antigravity\brain\ec7fd408-6441-4063-ab8a-32cc78b7aaa1\Presentacion_Checkpoint1_NextGenHealth.pptx'
    ]
    create_deck(paths)
