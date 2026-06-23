// ==========================================
// VARIÁVEIS E ELEMENTOS DA TELA
// ==========================================
const visor = document.getElementById('visor');
const btnCapturar = document.getElementById('btnCapturar');
let usoFrontal = true;
const canvas = document.getElementById('fotoRevelada');
const textoResultado = document.getElementById('textoResultado');
const contexto = canvas.getContext('2d');

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

// ==========================================
// FUNÇÕES DA CÂMERA
// ==========================================
async function iniciarCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' } 
        });
        visor.srcObject = stream;
    } catch (erro) {
        console.error("Erro ao acessar a câmera: ", erro);
        alert("Não foi possível acessar a câmera. Verifique as permissões.");
    }

    // Para a câmera atual antes de iniciar a nova
    if (video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
    }

    const constraints = {
        video: {
            facingMode: usarFrontal ? "user" : "environment"
        }
    };

    try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
    } catch (err) {
        console.error("Erro ao acessar câmera: ", err);
        textoResultado.innerText = "Erro ao alternar câmera.";
    }

    // Botão de inverter
    document.getElementById('btnInverterCamera').onclick = () => {
        usoFrontal = !usoFrontal; // Alterna entre true e false
        iniciarCamera(usoFrontal);
    };
}

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

    classificador.detect(canvas).then(predictions => {
        // Captura a imagem sempre, independente do sucesso da IA
        const imagemBase64 = canvas.toDataURL('image/jpeg');

        // Verifica se a IA encontrou algo
        if (predictions.length === 0) {
            textoResultado.innerText = "Nenhum objeto reconhecido.";
            // Mesmo sem objetos, salva com o rótulo "Desconhecido"
            salvarFoto("Desconhecido", imagemBase64);
            return;
        }

        // Caso a IA encontre objetos, prosseguimos normalmente
        const palpite = predictions[0].class;
        const certeza = Math.round(predictions[0].score * 100); 

        textoResultado.innerText = `Identificou: ${palpite} (Certeza: ${certeza}%)`;

        // Salva com o nome do objeto identificado
        salvarFoto(palpite, imagemBase64);

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
iniciarCamera();
inicializarIA();