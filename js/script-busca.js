document.addEventListener('DOMContentLoaded', function() {
    // Selectors
    const inputBusca = document.getElementById('inputBuscaField');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const clearIcon = document.getElementById('clearIcon');
    const contentBuscaDefault = document.getElementById('contentBuscaDefault');
    const contentUltimas = document.getElementById('contentUltimas');
    const ultimasPesquisasLista = document.getElementById('ultimasPesquisasLista');
    const nenhumaPesquisaInfo = document.getElementById('nenhumaPesquisaInfo');
    // Add selectors for results/no results if needed later
    const contentResultados = document.getElementById('contentResultados');
    const contentSemResultado = document.getElementById('contentSemResultado');
    const campeonatoListagemContainer = document.getElementById('campeonatoListagemContainer'); // Container for dynamic results
    const templateBaseCampeonato = document.getElementById('template-basecampeonato');
    const templateEventoPreMatch = document.getElementById('template-eventoprematch');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn'); // Selector for clear button
    const loadingBar = document.getElementById('loadingBar'); // Loading bar container
    const loadingBarProgress = document.getElementById('loadingBarProgress'); // Loading bar inner progress
    const semResultadoText = document.getElementById('semResultadoText'); // Selector for the text element

    let blurTimeout = null; // Timeout handle for blur event
    let isClickingRecent = false; // Flag to track clicks on recent items

    // --- LocalStorage Constants ---
    const MAX_HISTORY = 10;
    const HISTORY_KEY = 'searchHistory';

    // --- LocalStorage Functions ---
    function getSearchHistory() {
        try {
            const history = localStorage.getItem(HISTORY_KEY);
            return history ? JSON.parse(history) : [];
        } catch (e) {
            console.error("Erro ao ler histórico de busca:", e);
            // Clear corrupted history
            // localStorage.removeItem(HISTORY_KEY);
            return [];
        }
    }

    // Function to add a search term (will be called when search is performed)
    function addSearchTerm(term) {
        term = term.trim();
        if (!term) return;

        try {
            let history = getSearchHistory();
            // Remove existing entry to move it to the top (case-insensitive)
            history = history.filter(item => item.toLowerCase() !== term.toLowerCase());
            // Add new term to the beginning
            history.unshift(term);
            // Limit history size
            history = history.slice(0, MAX_HISTORY);
            // Save back to localStorage
            localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        } catch (e) {
            console.error("Erro ao salvar termo de busca:", e);
        }
    }

    // --- Debounce Function ---
    function debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    // --- API Simulation -> Real API Call ---
    async function performSearch(query) {
        console.log("Performing search for:", query);
        showSection(null);
        let sectionToShowAfterLoad = null;
        let timeoutOccurred = false; // Flag to track timeout

        // Reset timeout message text
        if (semResultadoText) {
             semResultadoText.innerHTML = "Nenhum resultado encontrado.<br>Tente alterar as palavras e busque<br>novamente.";
        }

        // Start loading bar
        if (loadingBar && loadingBarProgress) {
            loadingBar.style.opacity = '1';
            loadingBar.style.display = 'block';
            loadingBarProgress.style.width = '0%';
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                     loadingBarProgress.style.width = '100%';
                });
            });
        }

        const apiUrl = `https://recomendo-python.staging.reidopitaco.io/search/betting`;
        const fetchPromise = fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: query }),
        });

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('API Timeout')), 5000); // 5 seconds timeout
        });

        try {
            // Race the fetch against the timeout
            const response = await Promise.race([fetchPromise, timeoutPromise]);

            // If fetch won, process the response
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json(); 
            console.log("API Response:", data);

            const resultsArray = data?.data?.results;
            console.log("Data to render:", resultsArray);

            if (Array.isArray(resultsArray) && resultsArray.length > 0) {
                renderResults(resultsArray);
                sectionToShowAfterLoad = 'contentResultados';
                if (campeonatoListagemContainer) {
                    campeonatoListagemContainer.dataset.currentQuery = query; 
                }
            } else {
                console.log("API returned no results or unexpected format.");
                sectionToShowAfterLoad = 'contentSemResultado';
            }
        } catch (error) {
            console.error("Erro na busca ou timeout:", error);
            if (error.message === 'API Timeout') {
                 console.log("API request timed out after 5 seconds.");
                timeoutOccurred = true; // Set flag
                if (semResultadoText) { // Update text for timeout
                    semResultadoText.innerHTML = "A busca demorou mais do que o<br>esperado.Tente mudar os termos<br>ou buscar novamente.";
                }
            } else {
                // Handle other errors (network, parsing, etc.)
                if (semResultadoText) { // Keep default error text for other errors
                     semResultadoText.innerHTML = "Nenhum resultado encontrado.<br>Tente alterar as palavras e busque<br>novamente.";
                }
            }
             sectionToShowAfterLoad = 'contentSemResultado'; // Show 'no results' section for timeout/errors
        }
        finally {
            // Handle loading bar hiding (logic remains the same)
            if (loadingBar && loadingBarProgress) {
                 const widthAnimationDuration = 800;
                 const fadeOutAnimationDuration = 300;
                 setTimeout(() => {
                     loadingBar.style.opacity = '0';
                     setTimeout(() => {
                         loadingBar.style.display = 'none';
                         loadingBarProgress.style.width = '0%';
                         if (sectionToShowAfterLoad) {
                             showSection(sectionToShowAfterLoad);
                         }
                     }, fadeOutAnimationDuration);
                 }, widthAnimationDuration);
             } else {
                 if (sectionToShowAfterLoad) {
                        showSection(sectionToShowAfterLoad);
                 }
             }
        }
    }

    // --- UI Functions ---

    // Helper function to format date as DD/MM, HH:mm
    function formatMatchDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            // Pad single digits with leading zero
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month}, ${hours}:${minutes}`;
        } catch (e) {
            console.error("Error formatting date:", e);
            return dateString; // Return original string on error
        }
    }

    function renderResults(results) {
        if (!campeonatoListagemContainer || !templateBaseCampeonato || !templateEventoPreMatch) {
            console.error("Missing elements for rendering results");
            return;
        }
        console.log("renderResults: Starting. Container found:", !!campeonatoListagemContainer); // Log 2a: Check container
        console.log("renderResults: Templates found:", { base: !!templateBaseCampeonato, event: !!templateEventoPreMatch }); // Log 2b: Check templates
        campeonatoListagemContainer.innerHTML = ''; // Clear previous results

        // Filter results to only include matches before grouping
        const matchResults = results.filter(result => result.type === 'match');

        if (matchResults.length === 0) {
            console.log("No match results found after filtering.");
            showSection('contentSemResultado'); // Show no results if only non-match items were returned
            return;
        }

        // Group results by tournament_name
        const groupedResults = matchResults.reduce((acc, result) => {
            const key = result.tournament_name || 'Outros Campeonatos'; // Group items without name
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(result);
            return acc;
        }, {});
        console.log("renderResults: Grouped results:", groupedResults); // Log 3: Check grouping

        const tournamentNames = Object.keys(groupedResults);

        // Iterate through each group (tournament)
        tournamentNames.forEach((tournamentName, tIndex) => {
            const tournamentMatches = groupedResults[tournamentName];
            console.log(`renderResults: Processing tournament ${tIndex + 1}: ${tournamentName}`, tournamentMatches); // Log 4a: Check tournament loop

            // Clone the base campeonato template
            const campeonatoNode = templateBaseCampeonato.content.cloneNode(true);
            const baseCampeonatoDiv = campeonatoNode.querySelector('.basecampeonato');

            // Update tournament name
            const titleElement = baseCampeonatoDiv.querySelector('.titlecampeonato');
            if (titleElement) titleElement.textContent = tournamentName;

            // Add matches to this tournament block
            tournamentMatches.forEach((match, mIndex) => {
                 console.log(`  renderResults: Processing match ${mIndex + 1}:`, match); // Log 4b: Check match loop
                 // For now, only render pre-match events
                 const isPreMatch = match.status === 'not_started' && match.type === 'match';
                 console.log(`  renderResults: Is pre-match? ${isPreMatch} (Status: ${match.status}, Type: ${match.type})`); // Log 5: Check filter condition

                if (isPreMatch) {
                     // Clone the event template
                     const eventoNode = templateEventoPreMatch.content.cloneNode(true);
                     const eventoDiv = eventoNode.querySelector('.eventoprematch');

                     // Populate event data
                     const timeAElement = eventoDiv.querySelector('.txttime.timea');
                     const timeBElement = eventoDiv.querySelector('.txttime.timeb');
                     const dataElement = eventoDiv.querySelector('.txtdatapartida');
                     const linkElement = eventoDiv.querySelector('.basepartidaprematch'); // Get the link element

                     if(timeAElement) timeAElement.textContent = match.home_team_name || 'Time A';
                     if(timeBElement) timeBElement.textContent = match.away_team_name || 'Time B';
                     if(dataElement) dataElement.textContent = formatMatchDate(match.match_date);

                     // Add 'ultimo' class to the last event *within this tournament*
                     if (mIndex === tournamentMatches.filter(m => m.status === 'not_started' && m.type === 'match').length - 1) {
                          eventoDiv.classList.add('ultimo');
                     }

                    // Add click listener to save the search term
                    if (linkElement) {
                        linkElement.addEventListener('click', handleResultClick);
                    }

                    console.log("    renderResults: Appending event node to baseCampeonatoDiv"); // Log 6a: Check event append
                    baseCampeonatoDiv.appendChild(eventoNode);
                }
                // TODO: Handle 'eventoaovivo' when API supports it
            });

            // Add 'ultimo' class to the last tournament block *overall*
            if (tIndex === tournamentNames.length - 1) {
                baseCampeonatoDiv.classList.add('ultimo');
            }

            // Append the populated tournament block to the main container
            console.log(`renderResults: Appending tournament block ${tIndex + 1} to container`); // Log 6b: Check tournament append
            campeonatoListagemContainer.appendChild(campeonatoNode);
        });
    }

    // --- Event Handlers ---
    function handleResultClick(event) {
        event.preventDefault(); // Prevent link navigation
        console.log("Result link clicked");

        // Find the container and retrieve the original query
        const container = document.getElementById('campeonatoListagemContainer');
        const originalQuery = container?.dataset?.currentQuery;

        if (originalQuery) {
            console.log("Saving term to history:", originalQuery);
            addSearchTerm(originalQuery);
            // Future: Navigate to event details page or perform other action
            alert(`Termo "${originalQuery}" salvo no histórico!\n(A navegação para o evento ainda não foi implementada)`);
        } else {
            console.warn("Could not retrieve original query from container dataset.");
        }
    }

    // Helper function to show one content section and hide others
    function showSection(sectionIdToShow) {
        const sections = [contentBuscaDefault, contentUltimas, contentResultados, contentSemResultado];
        sections.forEach(section => {
            if (section) {
                if (section.id === sectionIdToShow) {
                    // Use flex for contentSemResultado, block for others (adjust if needed)
                    section.style.display = (section.id === 'contentSemResultado') ? 'flex' : 'block';
                    // If showing contentUltimas, also render its history
                    if (section.id === 'contentUltimas') {
                        renderSearchHistory();
                    }
                } else {
                    section.style.display = 'none';
                }
            }
        });
    }

    function renderSearchHistory() {
        const history = getSearchHistory();
        if (!ultimasPesquisasLista) return; // Guard clause
        ultimasPesquisasLista.innerHTML = ''; // Clear previous items (removes static ones too)

        // Show/hide clear button based on history existence
        if(clearHistoryBtn) clearHistoryBtn.style.display = history.length > 0 ? 'flex' : 'none';

        if (history.length === 0) {
            if(nenhumaPesquisaInfo) nenhumaPesquisaInfo.style.display = 'block';
            ultimasPesquisasLista.style.display = 'none';
        } else {
            if(nenhumaPesquisaInfo) nenhumaPesquisaInfo.style.display = 'none';
            ultimasPesquisasLista.style.display = 'block';

            history.forEach((term, index) => {
                const listItem = document.createElement('a');
                listItem.href = '#';
                listItem.classList.add('listaitemultimas', 'w-inline-block');

                const textDiv = document.createElement('div');
                textDiv.classList.add('txtitemultimas');
                textDiv.textContent = term;

                const iconImg = document.createElement('img');
                iconImg.src = 'images/iconSetaVerde.svg';
                iconImg.loading = 'lazy';
                iconImg.alt = '';
                iconImg.classList.add('iconitemultimas');

                listItem.appendChild(textDiv);
                listItem.appendChild(iconImg);

                if (index === history.length - 1) {
                    listItem.classList.add('ultima');
                }

                // Use mousedown to capture click before blur hides the list
                listItem.addEventListener('mousedown', (e) => {
                    e.preventDefault();
                    isClickingRecent = true; // Set flag to prevent immediate hide on blur
                    inputBusca.value = term;
                    inputBusca.dispatchEvent(new Event('input', { bubbles: true })); // Trigger input event for UI updates (e.g., clear icon)

                    // Ação futura: Aqui você pode adicionar a lógica para realmente executar a busca com o termo clicado
                    console.log("Pesquisar por (clique recente):", term);
                    // addSearchTerm(term); // Optionally add/move term when clicked from history

                    // Hide the list immediately after click -> Changed: Hide ALL sections immediately
                    // hideUltimasPesquisas(); 
                    showSection(null); // Hide all sections, performSearch will show the correct one
                    
                    // Trigger search immediately (debounced)
                    debouncedSearch(); 

                    // inputBusca.blur(); // Optionally remove focus
                });

                ultimasPesquisasLista.appendChild(listItem);
            });
        }
    }

    function showUltimasPesquisas() {
        if (contentBuscaDefault) contentBuscaDefault.style.display = 'none';
        if (contentUltimas) contentUltimas.style.display = 'block';
        renderSearchHistory();
    }

    function hideUltimasPesquisas() {
        if (contentBuscaDefault) contentBuscaDefault.style.display = 'block'; // Restore default view
        if (contentUltimas) contentUltimas.style.display = 'none';
    }

    // --- Debounced Input Handler ---
    const debouncedSearch = debounce(function() {
        const query = inputBusca.value.trim();
        if (query.length >= 3) {
            performSearch(query);
        } else if (query.length === 0) {
            // If input is cleared and still focused, show history
            if (document.activeElement === inputBusca) {
                showSection('contentUltimas');
            }
        } else {
            // Less than 3 chars, but not empty - maybe clear results?
            // Or just show history if focused?
             if (document.activeElement === inputBusca) {
                showSection('contentUltimas');
             }
        }
    }, 300); // 300ms debounce delay

    // --- Initialize ---
    // Initial state: show default content
    // Verify templates exist before adding listeners
    if (inputBusca && templateBaseCampeonato && templateEventoPreMatch) {
         showSection('contentBuscaDefault');
    } else {
        console.error("Essential elements or templates missing. Cannot initialize search.");
        // Maybe show an error message to the user?
    }

    // --- Event Listeners ---
    if (inputBusca && clearSearchBtn && clearIcon && contentBuscaDefault && contentUltimas && ultimasPesquisasLista && nenhumaPesquisaInfo && contentResultados && contentSemResultado) {

        // Handle input changes for search
        inputBusca.addEventListener('input', function() {
            clearIcon.classList.toggle('visible', inputBusca.value.trim() !== '');
            debouncedSearch(); // Call the debounced search function
        });

        // Scroll to top when input is clicked
        inputBusca.addEventListener('click', function() {
             window.scrollTo({
                 top: 0,
                 behavior: 'smooth'
             });
        });

        // Clear input when clear button is clicked
        clearSearchBtn.addEventListener('click', function() {
            inputBusca.value = '';
            clearIcon.classList.remove('visible');
            inputBusca.blur(); // Remove focus as requested
            // Even after blur, show history as the input is now empty -> Changed: show default
            showSection('contentBuscaDefault'); // Show default view after clearing and blurring
        });

        // Show recent searches or trigger search on focus
        inputBusca.addEventListener('focus', function() {
            console.log("Input focused");
            // Clear any pending blur timeout
            if (blurTimeout) {
                clearTimeout(blurTimeout);
                blurTimeout = null;
            }
            // Decide what to show on focus
            const query = inputBusca.value.trim();
            if (query.length >= 3) {
                // If focused with enough chars, perform search immediately
                performSearch(query);
            } else {
                // Otherwise, show recent searches
                 showSection('contentUltimas');
            }
        });

        // Hide recent searches / show default on blur, with delay
        inputBusca.addEventListener('blur', function() {
            console.log("Input blurred");
            // Use timeout to allow mousedown on recent items to register and set the flag
            blurTimeout = setTimeout(() => {
                 if (!isClickingRecent) { // Only hide/change if the blur wasn't caused by clicking a recent item
                    const query = inputBusca.value.trim();
                    if (query.length < 3) {
                        // If input is empty or less than 3 chars on blur, show default
                        console.log("Blur without click and query < 3, showing default");
                        showSection('contentBuscaDefault');
                    } else {
                        // If input has >= 3 chars, DO NOTHING, keep showing results/no-results
                        console.log("Blur without click and query >= 3, keeping current view");
                    }
                 }
                 // Reset flag after check, regardless of outcome
                 isClickingRecent = false;
                 blurTimeout = null; // Clear timeout handle
            }, 150); // Adjust delay if needed
        });

        // Handle clicks on "Mais Buscados" links
        const maisBuscadosLinks = document.querySelectorAll('.linkbuscados');
        maisBuscadosLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault(); // Prevent default link navigation

                const textElement = link.querySelector('.txttimemaisbuscados');
                if (textElement) {
                    const searchTerm = textElement.textContent.trim();
                    if (searchTerm) {
                        console.log("Clicked Mais Buscados:", searchTerm);
                        inputBusca.value = searchTerm;
                        // Trigger input event to update UI (like clear button)
                        inputBusca.dispatchEvent(new Event('input', { bubbles: true }));
                        // Scroll to top smoothly
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        // Perform the search immediately
                        performSearch(searchTerm);
                        // Optionally add to history here in the future
                        // addSearchTerm(searchTerm);
                    }
                }
            });
        });

    } else {
        console.error("Um ou mais elementos da busca não foram encontrados no DOM. Verifique os IDs em busca.html.");
    }

    // --- Event Listener for Clear History ---
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            console.log("Clearing search history");
            try {
                localStorage.removeItem(HISTORY_KEY);
                renderSearchHistory(); // Re-render the (now empty) list
                inputBusca.focus(); // Set focus back to search input
            } catch (e) {
                console.error("Erro ao limpar histórico de busca:", e);
            }
        });
    }
});
