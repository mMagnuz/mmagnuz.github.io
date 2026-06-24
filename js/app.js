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
const QUANTIDADE_FRAMES_ANALISE = 5;
const LIMIAR_FRAME_VALIDO = 0.35;
const LIMIAR_CONSENSO_FRAMES = 0.6;
const CATEGORIAS_VALIDAS = ['pessoas', 'animais', 'objetos', 'Desconhecido'];

const MAPA_COCO_PARA_CATEGORIA = {
    'person': 'pessoas',
    'bicycle': 'objetos',
    'car': 'objetos',
    'motorcycle': 'objetos',
    'airplane': 'objetos',
    'bus': 'objetos',
    'train': 'objetos',
    'truck': 'objetos',
    'boat': 'objetos',
    'traffic light': 'objetos',
    'fire hydrant': 'objetos',
    'stop sign': 'objetos',
    'parking meter': 'objetos',
    'bench': 'objetos',
    'bird': 'animais',
    'cat': 'animais',
    'dog': 'animais',
    'horse': 'animais',
    'sheep': 'animais',
    'cow': 'animais',
    'elephant': 'animais',
    'bear': 'animais',
    'zebra': 'animais',
    'giraffe': 'animais',
    'backpack': 'objetos',
    'umbrella': 'objetos',
    'handbag': 'objetos',
    'tie': 'objetos',
    'suitcase': 'objetos',
    'frisbee': 'objetos',
    'skis': 'objetos',
    'snowboard': 'objetos',
    'sports ball': 'objetos',
    'kite': 'objetos',
    'baseball bat': 'objetos',
    'baseball glove': 'objetos',
    'skateboard': 'objetos',
    'surfboard': 'objetos',
    'tennis racket': 'objetos',
    'bottle': 'objetos',
    'wine glass': 'objetos',
    'cup': 'objetos',
    'fork': 'objetos',
    'knife': 'objetos',
    'spoon': 'objetos',
    'bowl': 'objetos',
    'banana': 'objetos',
    'apple': 'objetos',
    'sandwich': 'objetos',
    'orange': 'objetos',
    'broccoli': 'objetos',
    'carrot': 'objetos',
    'hot dog': 'objetos',
    'pizza': 'objetos',
    'donut': 'objetos',
    'cake': 'objetos',
    'chair': 'objetos',
    'couch': 'objetos',
    'potted plant': 'objetos',
    'bed': 'objetos',
    'dining table': 'objetos',
    'toilet': 'objetos',
    'tv': 'objetos',
    'laptop': 'objetos',
    'mouse': 'objetos',
    'remote': 'objetos',
    'keyboard': 'objetos',
    'cell phone': 'objetos',
    'microwave': 'objetos',
    'oven': 'objetos',
    'toaster': 'objetos',
    'sink': 'objetos',
    'refrigerator': 'objetos',
    'book': 'objetos',
    'clock': 'objetos',
    'vase': 'objetos',
    'scissors': 'objetos',
    'teddy bear': 'objetos',
    'hair drier': 'objetos',
    'toothbrush': 'objetos'
};

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

    return 'objetos';
}

function resumirPredicoes(predictions) {
    const filtradas = predictions
        .filter(predicao => predicao.score >= 0.2);

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
    const pesoTotal = Array.from(votos.values()).reduce((soma, peso) => soma + peso, 0);
    const confiancaRelativa = pesoTotal > 0 ? melhorPeso / pesoTotal : destaque.score;

    return {
        categoria: categoriaVencedora,
        confianca: Math.max(destaque.score, confiancaRelativa),
        destaque,
        usadas: filtradas
    };
}

function aguardarProximoFrame() {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

async function analisarMultiplosFrames(quantidadeFrames = 100) {
    const todasPredicoes = [];
    const votosPorFrame = new Map();

    for (let indice = 0; indice < quantidadeFrames; indice += 1) {
        const predicoesDoFrame = await classificador.detect(visor);
        const resumoDoFrame = resumirPredicoes(predicoesDoFrame);

        if (resumoDoFrame.confianca >= LIMIAR_FRAME_VALIDO) {
            todasPredicoes.push(...resumoDoFrame.usadas);
            const votos = votosPorFrame.get(resumoDoFrame.categoria) || 0;
            votosPorFrame.set(resumoDoFrame.categoria, votos + 1);
        }

        await aguardarProximoFrame();
    }

    const resumoFinal = resumirPredicoes(todasPredicoes);
    const totalFramesValidos = Array.from(votosPorFrame.values()).reduce((soma, valor) => soma + valor, 0);

    if (totalFramesValidos > 0) {
        let categoriaConsenso = resumoFinal.categoria;
        let maiorVotos = 0;

        votosPorFrame.forEach((votos, categoria) => {
            if (votos > maiorVotos) {
                maiorVotos = votos;
                categoriaConsenso = categoria;
            }
        });

        const percentualConsenso = maiorVotos / totalFramesValidos;

        if (percentualConsenso >= LIMIAR_CONSENSO_FRAMES) {
            resumoFinal.categoria = categoriaConsenso;
        }
    }

    return resumoFinal;
}

function decidirCategoriaManual(categoriaSugerida, confianca) {
    const resposta = window.confirm(
        `A IA sugeriu "${categoriaSugerida}" com ${Math.round(confianca * 100)}% de confiança. Confirmar?`
    );

    if (resposta) {
        return categoriaSugerida;
    }

    const alternativa = window.prompt(
        'Digite a categoria final: pessoas, animais, objetos ou Desconhecido',
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
    const imagemBase64 = canvas.toDataURL('image/jpeg');
    canvas.style.display = 'block';

    // Se a IA ainda não carregou, encerra a função aqui
    if (!classificador) {
        salvarFoto('Desconhecido', imagemBase64);
        return;
    }

    // Inicia o processo de análise
    textoResultado.innerText = "Analisando vários frames...";

    analisarMultiplosFrames(QUANTIDADE_FRAMES_ANALISE).then(resumo => {
        let categoriaFinal = resumo.categoria;
        let confiancaFinal = resumo.confianca;

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