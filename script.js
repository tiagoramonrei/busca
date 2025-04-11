const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const outputElement = document.getElementById('output');

searchButton.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (!query) {
        outputElement.textContent = 'Por favor, digite algo para buscar.';
        return;
    }

    outputElement.textContent = 'Buscando...';

    try {
        const response = await fetch('https://recomendo-python.staging.reidopitaco.io/search/betting', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: query }),
        });

        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data && data.data && data.data.results) {
            outputElement.textContent = JSON.stringify(data.data.results, null, 2);
        } else {
             outputElement.textContent = 'Nenhum resultado encontrado ou formato de resposta inesperado.';
        }

    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        outputElement.textContent = `Erro ao buscar dados: ${error.message}`;
    }
});
