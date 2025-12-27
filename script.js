document.addEventListener('DOMContentLoaded', () => {

    // =========================================
    // CONFIGURATION
    // =========================================
    const CONFIG = {
        // Sensitive IDs moved to configuration object
        userId: 'DObRu1vyStbUynoQmTcHBlhs55z2',
        projectId: 'dressr',
        debug: false // Set to true to enable console logs
    };

    // Helper for conditional logging
    function debugLog(...args) {
        if (CONFIG.debug) {
            console.log(...args);
        }
    }
    
    // =========================================
    // HERO ANIMATION (Memphis Shapes)
    // =========================================
    const heroAnimation = document.getElementById('hero-animation');
    const colors = ['var(--primary)', 'var(--secondary)', 'var(--accent)', 'var(--text)'];
    
    function createShape() {
        if (!heroAnimation) return;
        const shape = document.createElement('div');
        shape.classList.add('geo-shape');
        
        // Random size
        const size = Math.random() * 50 + 20;
        shape.style.width = `${size}px`;
        shape.style.height = `${size}px`;
        
        // Random position
        shape.style.left = `${Math.random() * 100}%`;
        shape.style.top = `${Math.random() * 100}%`;
        
        // Random shape type (Square, Circle, Triangle)
        const type = Math.floor(Math.random() * 3);
        if (type === 0) {
            shape.style.borderRadius = '50%'; // Circle
        } else if (type === 1) {
            shape.style.borderRadius = '0'; // Square
        } else {
            // Triangle approximation using clip-path
            shape.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
            shape.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            shape.style.border = 'none';
        }

        // Color
        if (type !== 2) {
            shape.style.border = `3px solid ${colors[Math.floor(Math.random() * colors.length)]}`;
        }
        
        // Animation timing
        shape.style.animationDuration = `${10 + Math.random() * 10}s`;
        shape.style.animationDelay = `-${Math.random() * 10}s`;
        
        heroAnimation.appendChild(shape);
    }

    // Create 15 floating shapes
    for(let i=0; i<15; i++) {
        createShape();
    }

    // =========================================
    // MOBILE MENU
    // =========================================
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('header nav');
    
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('active');
            menuToggle.textContent = nav.classList.contains('active') ? '✕' : '☰';
        });

        // Close menu when clicking links
        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('active');
                menuToggle.textContent = '☰';
            });
        });
    }

    // =========================================
    // FAQ ACCORDION
    // =========================================
    const faqQuestions = document.querySelectorAll('.faq-question');
    
    faqQuestions.forEach(question => {
        question.addEventListener('click', () => {
            // Close others
            faqQuestions.forEach(q => {
                if (q !== question) {
                    q.classList.remove('active');
                    q.nextElementSibling.style.maxHeight = null;
                }
            });
            
            // Toggle current
            question.classList.toggle('active');
            const answer = question.nextElementSibling;
            
            if (question.classList.contains('active')) {
                answer.style.maxHeight = answer.scrollHeight + "px";
            } else {
                answer.style.maxHeight = null;
            }
        });
    });

    // =========================================
    // MODALS
    // =========================================
    const openButtons = document.querySelectorAll('[data-modal-target]');
    const closeButtons = document.querySelectorAll('[data-modal-close]');
    
    function openModal(modalId) {
        const modal = document.getElementById(modalId + '-modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden'; // Prevent bg scroll
        }
    }
    
    function closeModal(modalId) {
        const modal = document.getElementById(modalId + '-modal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }
    
    openButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const target = btn.getAttribute('data-modal-target');
            openModal(target);
        });
    });
    
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-modal-close');
            closeModal(target);
        });
    });
    
    // Close on outside click
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.add('hidden');
            document.body.style.overflow = '';
        }
    });

    // =========================================
    // BACKEND WIRING & LOGIC
    // =========================================
    
    // DOM Elements
    const dropZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const previewImage = document.getElementById('preview-image');
    const previewContainer = document.getElementById('preview-container');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const generateBtn = document.getElementById('generate-btn');
    const clearBtn = document.getElementById('clear-btn'); // Acts as Reset Button
    
    const resultContainer = document.getElementById('result-container');
    const resultPlaceholder = document.getElementById('result-placeholder');
    const loadingState = document.getElementById('loading-state');
    const resultFinal = document.getElementById('result-final');
    const downloadBtn = document.getElementById('download-btn');

    // State
    let currentUploadedUrl = null;

    // --- UTILITY FUNCTIONS ---

    // Generate nanoid for unique filename
    function generateNanoId(length = 21) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // --- API FUNCTIONS ---

    // Upload file to CDN storage
    async function uploadFile(file) {
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const uniqueId = generateNanoId();
        const fileName = 'media/' + uniqueId + '.' + fileExtension;
        
        // Step 1: Get signed URL from API
        const signedUrlResponse = await fetch(
            'https://core.faceswapper.ai/media/get-upload-url?fileName=' + encodeURIComponent(fileName) + '&projectId=' + CONFIG.projectId,
            { method: 'GET' }
        );
        
        if (!signedUrlResponse.ok) {
            throw new Error('Failed to get signed URL: ' + signedUrlResponse.statusText);
        }
        
        const signedUrl = await signedUrlResponse.text();
        debugLog('Got signed URL');
        
        // Step 2: PUT file to signed URL
        const uploadResponse = await fetch(signedUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type
            }
        });
        
        if (!uploadResponse.ok) {
            throw new Error('Failed to upload file: ' + uploadResponse.statusText);
        }
        
        // Step 3: Return download URL
        const downloadUrl = 'https://assets.dressr.ai/' + fileName;
        debugLog('Uploaded to:', downloadUrl);
        return downloadUrl;
    }

    // Submit generation job
    async function submitImageGenJob(imageUrl) {
        // Hardcoded for 'image-effects' based on config
        const isVideo = false; 
        const endpoint = 'https://api.chromastudio.ai/image-gen';
        
        const headers = {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json',
            'sec-ch-ua-platform': '"Windows"',
            'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
            'sec-ch-ua-mobile': '?0'
        };

        const body = {
            model: 'image-effects',
            toolType: 'image-effects',
            effectId: 'photoToVectorArt',
            imageUrl: imageUrl,
            userId: CONFIG.userId,
            removeWatermark: true,
            isPrivate: true
        };

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });
        
        if (!response.ok) {
            throw new Error('Failed to submit job: ' + response.statusText);
        }
        
        const data = await response.json();
        debugLog('Job submitted:', data.jobId, 'Status:', data.status);
        return data;
    }

    // Poll job status
    const POLL_INTERVAL = 2000; // 2 seconds
    const MAX_POLLS = 60; // Max 2 minutes of polling

    async function pollJobStatus(jobId) {
        const baseUrl = 'https://api.chromastudio.ai/image-gen';
        let polls = 0;
        
        while (polls < MAX_POLLS) {
            const response = await fetch(
                `${baseUrl}/${CONFIG.userId}/${jobId}/status`,
                {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json, text/plain, */*'
                    }
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to check status: ' + response.statusText);
            }
            
            const data = await response.json();
            debugLog('Poll', polls + 1, '- Status:', data.status);
            
            if (data.status === 'completed') {
                debugLog('Job completed! Result:', data.result?.[0]?.image);
                return data;
            }
            
            if (data.status === 'failed' || data.status === 'error') {
                throw new Error(data.error || 'Job processing failed');
            }
            
            // Update UI with progress
            updateStatus('PROCESSING... (' + (polls + 1) + ')');
            
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
            polls++;
        }
        
        throw new Error('Job timed out after ' + MAX_POLLS + ' polls');
    }

    // --- UI HELPER FUNCTIONS ---

    function showLoading() {
        if (loadingState) {
            loadingState.classList.remove('hidden');
            // Add a status text element if not present
            let statusText = document.getElementById('loading-status-text');
            if (!statusText) {
                statusText = document.createElement('p');
                statusText.id = 'loading-status-text';
                statusText.className = 'mt-2 text-sm text-gray-500 font-mono';
                loadingState.appendChild(statusText);
            }
        }
        if (resultPlaceholder) resultPlaceholder.classList.add('hidden');
        if (resultFinal) resultFinal.classList.add('hidden');
        if (downloadBtn) downloadBtn.style.display = 'none';
        if (generateBtn) generateBtn.disabled = true;
    }

    function hideLoading() {
        if (loadingState) loadingState.classList.add('hidden');
    }

    function updateStatus(text) {
        const statusText = document.getElementById('loading-status-text');
        if (statusText) {
            statusText.textContent = text;
        } else {
            debugLog('Status:', text);
        }
    }

    function showError(message) {
        alert('Error: ' + message);
        hideLoading();
        if (resultPlaceholder) resultPlaceholder.classList.remove('hidden');
        if (generateBtn) generateBtn.disabled = false;
    }

    function showPreview(url) {
        if (previewImage) {
            previewImage.src = url;
            previewImage.classList.remove('hidden');
        }
        if (uploadPlaceholder) uploadPlaceholder.classList.add('hidden');
        if (previewContainer) previewContainer.classList.remove('hidden');
    }

    function showResultMedia(url) {
        // For Image Effects, we use the existing result-final image element
        const container = resultFinal ? resultFinal.parentElement : document.querySelector('.result-area');
        
        if (!container) return;
        
        // Hide placeholder
        if (resultPlaceholder) resultPlaceholder.classList.add('hidden');

        const isVideo = url.toLowerCase().match(/\.(mp4|webm)(\?.*)?$/i);
        
        if (isVideo) {
            if (resultFinal) resultFinal.style.display = 'none';
            let video = document.getElementById('result-video');
            if (!video) {
                video = document.createElement('video');
                video.id = 'result-video';
                video.controls = true;
                video.autoplay = true;
                video.loop = true;
                video.className = resultFinal ? resultFinal.className : 'w-full h-auto rounded-lg';
                video.style.maxWidth = '100%';
                container.appendChild(video);
            }
            video.src = url;
            video.style.display = 'block';
        } else {
            const video = document.getElementById('result-video');
            if (video) video.style.display = 'none';
            
            if (resultFinal) {
                resultFinal.crossOrigin = 'anonymous'; // Important for download canvas fallback
                resultFinal.src = url;
                resultFinal.classList.remove('hidden');
                resultFinal.style.display = 'block';
                resultFinal.style.filter = 'none'; // Remove previous mock filters
            }
        }
    }

    function showDownloadButton(url) {
        if (downloadBtn) {
            downloadBtn.dataset.url = url;
            downloadBtn.style.display = 'inline-flex';
            downloadBtn.disabled = false;
        }
    }

    function enableGenerateButton() {
        if (generateBtn) {
            generateBtn.disabled = false;
        }
    }

    // --- EVENT HANDLERS ---

    // Handler when file is selected - uploads immediately
    async function handleFileSelect(file) {
        try {
            // Show loading in the preview area briefly or just status
            updateStatus('UPLOADING...');
            
            // Note: We could show local preview first, but prompt flow says upload first
            // To make UI responsive, let's show local preview while uploading
            const reader = new FileReader();
            reader.onload = (e) => showPreview(e.target.result);
            reader.readAsDataURL(file);

            // Upload
            generateBtn.textContent = 'Uploading...';
            generateBtn.disabled = true;

            const uploadedUrl = await uploadFile(file);
            currentUploadedUrl = uploadedUrl;
            
            // Confirm upload success in UI
            generateBtn.textContent = 'Generate';
            enableGenerateButton();
            updateStatus('READY');
            
        } catch (error) {
            updateStatus('ERROR');
            showError(error.message);
            generateBtn.textContent = 'Generate';
        }
    }

    // Handler when Generate button is clicked
    async function handleGenerate() {
        if (!currentUploadedUrl) return;
        
        try {
            showLoading();
            updateStatus('SUBMITTING JOB...');
            
            // Step 1: Submit job
            const jobData = await submitImageGenJob(currentUploadedUrl);
            
            updateStatus('JOB QUEUED...');
            
            // Step 2: Poll for completion
            const result = await pollJobStatus(jobData.jobId);
            
            // Step 3: Get result URL
            const resultItem = Array.isArray(result.result) ? result.result[0] : result.result;
            const resultUrl = resultItem?.mediaUrl || resultItem?.video || resultItem?.image;
            
            if (!resultUrl) {
                throw new Error('No image URL in response');
            }
            
            debugLog('Result image URL:', resultUrl);
            
            // Step 4: Display result
            showResultMedia(resultUrl);
            
            updateStatus('COMPLETE');
            hideLoading();
            showDownloadButton(resultUrl);
            
        } catch (error) {
            hideLoading();
            updateStatus('ERROR');
            showError(error.message);
        }
    }

    // --- WIRING ---

    // File Input
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) handleFileSelect(file);
        });
    }

    // Drag & Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropZone.style.borderColor = 'var(--primary)';
        dropZone.style.background = 'rgba(255, 51, 102, 0.05)';
    }

    function unhighlight() {
        dropZone.style.borderColor = '';
        dropZone.style.background = '';
    }

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const file = dt.files[0];
        if (file) handleFileSelect(file);
    }, false);
    
    // Click to upload (delegated to input)
    dropZone.addEventListener('click', (e) => {
        if(e.target !== clearBtn) fileInput.click();
    });

    // Generate Button
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerate);
    }

    // Reset/Clear Button
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering upload click
            
            currentUploadedUrl = null;
            fileInput.value = '';
            
            if (previewImage) {
                previewImage.src = '';
                previewImage.classList.add('hidden');
            }
            if (uploadPlaceholder) uploadPlaceholder.classList.remove('hidden');
            if (previewContainer) previewContainer.classList.add('hidden');
            if (generateBtn) {
                generateBtn.disabled = true;
                generateBtn.textContent = 'Generate';
            }
            
            // Reset Result Area
            if (resultPlaceholder) resultPlaceholder.classList.remove('hidden');
            if (resultFinal) {
                resultFinal.classList.add('hidden');
                resultFinal.src = '';
            }
            if (downloadBtn) downloadBtn.style.display = 'none';
            if (loadingState) loadingState.classList.add('hidden');
        });
    }

    // Download Button - Robust Implementation
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            const url = downloadBtn.dataset.url;
            if (!url) return;
            
            const originalText = downloadBtn.textContent;
            downloadBtn.textContent = 'Downloading...';
            downloadBtn.disabled = true;
            
            try {
                // Method 1: Fetch as blob (Forces download dialog)
                const response = await fetch(url, {
                    mode: 'cors',
                    credentials: 'omit'
                });
                
                if (!response.ok) throw new Error('Network response was not ok');
                
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = 'vector_art_' + generateNanoId(8) + '.png';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
                
            } catch (err) {
                console.warn('Fetch download failed, trying canvas fallback:', err);
                
                // Method 2: Canvas Fallback
                try {
                    const img = document.getElementById('result-final');
                    if (img && img.complete && img.naturalWidth > 0) {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        
                        canvas.toBlob((blob) => {
                            if (blob) {
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.download = 'vector_art_' + generateNanoId(8) + '.png';
                                link.click();
                                setTimeout(() => URL.revokeObjectURL(link.href), 1000);
                            } else {
                                throw new Error('Canvas blob failed');
                            }
                        }, 'image/png');
                    } else {
                        throw new Error('Image not ready for canvas');
                    }
                } catch (canvasErr) {
                    console.error('Canvas fallback failed:', canvasErr);
                    
                    // Method 3: Last Resort - Open in new tab
                    alert('Download failed due to browser security. Opening image in new tab - please right-click and Save As.');
                    window.open(url, '_blank');
                }
            } finally {
                downloadBtn.textContent = originalText;
                downloadBtn.disabled = false;
            }
        });
    }
});