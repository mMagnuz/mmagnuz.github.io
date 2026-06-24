// ==========================================
// DOM
// ==========================================
const visor = document.getElementById('visor');
const btnCapturar = document.getElementById('btnCapturar');
let usoFrontal = true;
const canvas = document.getElementById('fotoRevelada');
const textoResultado = document.getElementById('textoResultado');
const contexto = canvas.getContext('2d');
const LIMIAR_CONFIANCA = 0.66;
const CATEGORIAS_VALIDAS = ['pessoas', 'animais', 'paisagens', 'objetos', 'Desconhecido'];

const MAPA_COCO_PARA_CATEGORIA = {
    person: 'pessoas',
    bird: 'animais',
    cat: 'animais',
    dog: 'animais',
    horse: 'animais',
    sheep: 'animais',
    cow: 'animais',
    elephant: 'animais',
    bear: 'animais',
    zebra: 'animais',
    giraffe: 'animais'
};

const LABELS_OBJETOS = new Set([
    'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
    'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird',
    'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe',
    'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush'
]);

const modal = document.getElementById('modalGaleria');
const btnAbrir = document.getElementById('btnAbrirGaleria');
const btnFechar = document.getElementById('btnFecharGaleria');

btnAbrir.addEventListener('click', () => {
    modal.style.display = 'block';
    renderizarGaleria();
});

btnFechar.addEventListener('click', () => {
    modal.style.display = 'none';
});

let classificador;

function normalizarCategoria(categoria) {
    const valor = String(categoria || '').trim();

    if (CATEGORIAS_VALIDAS.includes(valor)) {
        return valor;
    }

    return 'Desconhecido';
}

function mapearClasseParaCategoria(classe) {
    if (!classe) {
        return 'Desconhecido';
    }

    if (MAPA_COCO_PARA_CATEGORIA[classe]) {
        return MAPA_COCO_PARA_CATEGORIA[classe];
    }

    if (LABELS_OBJETOS.has(classe)) {
        return 'objetos';
    }

    return 'objetos';
}

function resumirPredicoes(predictions) {
    const filtradas = predictions
        .filter(predicao => predicao.score >= 0.3)
        .slice(0, 5);

    if (filtradas.length === 0) {
        return {
            categoria: 'Desconhecido',
            confianca: 0,
            destaque: null
        };
    }

    const votos = new Map();

    filtradas.forEach(predicao => {
        const categoria = mapearClasseParaCategoria(predicao.class);
        const acumulado = votos.get(categoria) || 0;
        votos.set(categoria, acumulado + predicao.score);
    });

    let categoriaVencedora = 'objetos';
    let melhorPeso = -1;

    votos.forEach((peso, categoria) => {
        if (peso > melhorPeso) {
            melhorPeso = peso;
            categoriaVencedora = categoria;
        }
    });

    const destaque = filtradas[0];

    return {
        categoria: categoriaVencedora,
        confianca: destaque.score,
        destaque,
        usadas: filtradas
    };
}

async function extrairTextoOCR() {
    if (typeof Tesseract === 'undefined') {
        return '';
    }

    try {
        const resultado = await Tesseract.recognize(canvas, 'por+eng');
        return resultado.data.text || '';
    } catch (erro) {
        console.warn('OCR falhou:', erro);
        return '';
    }
}

function decidirCategoriaManual(categoriaSugerida, confianca) {
    const resposta = window.confirm(
        `A IA sugeriu "${categoriaSugerida}" com ${Math.round(confianca * 100)}% de confiança. Confirmar?`
    );

    if (resposta) {
        return categoriaSugerida;
    }

    const alternativa = window.prompt(
        'Digite a categoria final: pessoas, animais, paisagens, objetos ou Desconhecido',
        categoriaSugerida
    );

    return normalizarCategoria(alternativa);
}

// ==========================================
// FUNÇÕES DA CÂMERA
// ==========================================
async function iniciarCamera(usarFrontal) {
    if (visor.srcObject) {
        visor.srcObject.getTracks().forEach(track => track.stop());
    }

    try {
        const constraints = {
            video: {
                facingMode: { ideal: usarFrontal ? "user" : "environment" }
            }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        visor.srcObject = stream;

        await visor.play().catch(() => { });
    } catch (err) {
        console.error("Erro ao acessar câmera: ", err);
        textoResultado.innerText = "Erro ao acessar a câmera.";
    }
}

document.getElementById('btnInverterCamera').onclick = async () => {
    usoFrontal = !usoFrontal;
    await iniciarCamera(usoFrontal);
};

function tirarFoto() {
    // Prepara e desenha o canvas
    canvas.width = visor.videoWidth;
    canvas.height = visor.videoHeight;
    contexto.drawImage(visor, 0, 0, canvas.width, canvas.height);
    canvas.style.display = 'block';

    // Se a IA ainda não carregou, encerra a função aqui
    if (!classificador) return;

    // Inicia o processo de análise
    textoResultado.innerText = "Analisando a imagem...";

    Promise.all([
        classificador.detect(canvas)
    ]).then(([predictions]) => {
        // Captura a imagem sempre, independente do sucesso da IA
        const imagemBase64 = canvas.toDataURL('image/jpeg');
        const resumo = resumirPredicoes(predictions);

        let categoriaFinal = resumo.categoria;
        let confiancaFinal = resumo.confianca;

        if (categoriaFinal === 'Desconhecido') {
            categoriaFinal = 'paisagens';
            confiancaFinal = 0.35;
        }

        if (confiancaFinal < LIMIAR_CONFIANCA) {
            categoriaFinal = decidirCategoriaManual(categoriaFinal, confiancaFinal);
        }

        textoResultado.innerText = `Categoria: ${categoriaFinal} (Confiança: ${Math.round(confiancaFinal * 100)}%)`;
        salvarFoto(categoriaFinal, imagemBase64);

    }).catch(erro => {
        console.error("Erro na detecção: ", erro);
        textoResultado.innerText = "Erro ao analisar a imagem.";
    });
}

// ==========================================
// FUNÇÕES DA INTELIGÊNCIA ARTIFICIAL
// ==========================================
function inicializarIA() {
    textoResultado.innerText = "Carregando motor COCO-SSD oficial";

    // Pede para a biblioteca oficial baixar o modelo da nuvem
    cocoSsd.load().then(modelo => {
        classificador = modelo;
        textoResultado.innerText = "IA Pronta";
        console.log("COCO-SSD carregado com sucesso");
    }).catch(erro => {
        console.error("Erro ao carregar o modelo: ", erro);
        textoResultado.innerText = "Falha ao baixar o modelo de IA";
    });
}

// ==========================================
// FUNÇÕES DA GALERIA
// ==========================================
// Função para salvar no LocalStorage
function salvarFoto(label, imagemData) {
    // Pega o que já existe no banco (ou cria uma lista vazia se for a primeira vez)
    let galeria = JSON.parse(localStorage.getItem('minhaGaleria')) || [];

    // Adiciona a nova foto
    galeria.push({ label: label, data: imagemData });

    // Salva de volta no LocalStorage
    localStorage.setItem('minhaGaleria', JSON.stringify(galeria));

    // Atualiza a tela
    renderizarGaleria();
}

// Função para mostrar as fotos na tela
function renderizarGaleria(filtro = 'Tudo') {
    const container = document.getElementById('fotosSalvas');
    container.innerHTML = '';

    let galeria = JSON.parse(localStorage.getItem('minhaGaleria')) || [];
    let fotosParaMostrar = filtro === 'Tudo' ? galeria : galeria.filter(item => item.label === filtro);

    fotosParaMostrar.forEach((item, index) => {
        const div = document.createElement('div');
        div.style.position = 'relative';

        const img = document.createElement('img');
        img.src = item.data;
        img.style.width = '150px';

        const btnExcluir = document.createElement('button');
        btnExcluir.innerText = "X";
        btnExcluir.style.position = 'absolute';
        btnExcluir.style.top = '0';
        btnExcluir.style.right = '0';
        btnExcluir.onclick = () => {
            galeria.splice(index, 1); // Remove do array
            localStorage.setItem('minhaGaleria', JSON.stringify(galeria));
            renderizarGaleria(filtro); // Recarrega a tela
        };

        div.appendChild(img);
        div.appendChild(btnExcluir);
        container.appendChild(div);
    });
}

function filtrarGaleria(categoria) {
    renderizarGaleria(categoria);
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================
btnCapturar.addEventListener('click', tirarFoto);
iniciarCamera(usoFrontal);
inicializarIA();