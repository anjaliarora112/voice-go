/* VoiceGo - Frontend Application */

let selectedVoiceId = null;
let audioFile = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let recordStartTime = null;
let recordTimerInterval = null;
let audioContext = null;

/* ============ Voice Selection ============ */

function selectVoice(voiceId) {
    document.querySelectorAll('.voice-card').forEach(card => {
        card.classList.remove('selected');
    });

    const card = document.querySelector(`[data-voice-id="${voiceId}"]`);
    if (card) {
        card.classList.add('selected');
        selectedVoiceId = voiceId;

        const name = card.querySelector('.voice-name').textContent;
        const info = document.getElementById('selectedVoiceInfo');
        const nameSpan = document.getElementById('selectedVoiceName');
        nameSpan.textContent = name;
        info.style.display = 'block';

        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    updateConvertButton();
}

function filterVoices(gender) {
    document.querySelectorAll('.gender-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.gender === gender);
    });

    document.querySelectorAll('.voice-card').forEach(card => {
        if (gender === 'all') {
            card.style.display = '';
        } else {
            card.style.display = card.dataset.gender === gender ? '' : 'none';
        }
    });
}

/* ============ File Upload ============ */

const uploadArea = document.getElementById('uploadArea');

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith('audio/')) {
        processAudioFile(files[0]);
    } else {
        showToast('Please drop an audio file', 'error');
    }
});

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        processAudioFile(file);
    }
}

function processAudioFile(file) {
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
        showToast('File too large. Maximum size is 50MB.', 'error');
        return;
    }

    audioFile = file;
    const url = URL.createObjectURL(file);
    const audio = document.getElementById('originalAudio');
    audio.src = url;

    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    document.getElementById('audioInfo').textContent = `${file.name} (${sizeMB} MB)`;

    document.getElementById('audioPreview').classList.add('show');
    drawWaveform(file);
    updateConvertButton();
    showToast('Audio loaded successfully!', 'success');
}

function removeAudio() {
    audioFile = null;
    document.getElementById('audioPreview').classList.remove('show');
    document.getElementById('originalAudio').src = '';
    document.getElementById('audioInput').value = '';
    updateConvertButton();
}

/* ============ Recording ============ */

async function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        await startRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                sampleRate: 44100
            }
        });

        mediaRecorder = new MediaRecorder(stream, {
            mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm'
        });

        recordedChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'audio/webm' });
            audioFile = new File([blob], 'recording.webm', { type: 'audio/webm' });

            const url = URL.createObjectURL(blob);
            document.getElementById('originalAudio').src = url;

            const sizeMB = (blob.size / (1024 * 1024)).toFixed(2);
            const duration = ((Date.now() - recordStartTime) / 1000).toFixed(0);
            document.getElementById('audioInfo').textContent =
                `Recording (${duration}s, ${sizeMB} MB)`;

            document.getElementById('audioPreview').classList.add('show');
            drawWaveform(blob);
            updateConvertButton();
            showToast('Recording saved!', 'success');

            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start(250);
        isRecording = true;
        recordStartTime = Date.now();

        const btn = document.getElementById('recordBtn');
        btn.classList.add('recording');
        document.getElementById('recordBtnText').textContent = 'Stop Recording';

        const timer = document.getElementById('recordTimer');
        timer.classList.add('show');
        recordTimerInterval = setInterval(updateRecordTimer, 100);

        // Auto-stop at 5 minutes
        setTimeout(() => {
            if (isRecording) {
                stopRecording();
                showToast('Maximum recording time reached (5 min)', 'info');
            }
        }, 5 * 60 * 1000);

    } catch (err) {
        showToast('Microphone access denied. Please allow microphone access.', 'error');
    }
}

function stopRecording() {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    isRecording = false;

    const btn = document.getElementById('recordBtn');
    btn.classList.remove('recording');
    document.getElementById('recordBtnText').textContent = 'Record Your Voice';

    clearInterval(recordTimerInterval);
    document.getElementById('recordTimer').classList.remove('show');
}

function updateRecordTimer() {
    const elapsed = Math.floor((Date.now() - recordStartTime) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('recordTimer').textContent = `${mins}:${secs}`;
}

/* ============ Waveform Visualization ============ */

async function drawWaveform(fileOrBlob) {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        const arrayBuffer = await fileOrBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const data = audioBuffer.getChannelData(0);

        const canvas = document.getElementById('waveformCanvas');
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth * 2;
        canvas.height = 160;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const step = Math.ceil(data.length / canvas.width);
        const mid = canvas.height / 2;

        const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
        gradient.addColorStop(0, '#6C63FF');
        gradient.addColorStop(0.5, '#00D9FF');
        gradient.addColorStop(1, '#FF6584');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        for (let i = 0; i < canvas.width; i++) {
            let min = 1.0, max = -1.0;
            for (let j = 0; j < step; j++) {
                const idx = i * step + j;
                if (idx < data.length) {
                    if (data[idx] < min) min = data[idx];
                    if (data[idx] > max) max = data[idx];
                }
            }
            ctx.moveTo(i, mid + min * mid * 0.9);
            ctx.lineTo(i, mid + max * mid * 0.9);
        }

        ctx.stroke();
    } catch (err) {
        console.log('Waveform drawing skipped:', err.message);
    }
}

/* ============ Voice Conversion ============ */

function updateConvertButton() {
    const btn = document.getElementById('convertBtn');
    btn.disabled = !(selectedVoiceId && audioFile);

    if (selectedVoiceId && audioFile) {
        btn.textContent = 'Transform Voice Now';
    } else if (!selectedVoiceId && !audioFile) {
        btn.textContent = 'Select a voice & upload audio';
    } else if (!selectedVoiceId) {
        btn.textContent = 'Select a voice first';
    } else {
        btn.textContent = 'Upload or record audio first';
    }
}

async function convertVoice() {
    if (!selectedVoiceId || !audioFile) {
        showToast('Please select a voice and upload audio first', 'error');
        return;
    }

    const convertBtn = document.getElementById('convertBtn');
    convertBtn.disabled = true;
    convertBtn.textContent = 'Converting...';

    const progress = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    progress.classList.add('show');

    const steps = [
        { pct: 15, text: 'Uploading audio...' },
        { pct: 35, text: 'Analyzing voice patterns...' },
        { pct: 55, text: 'Applying pitch transformation...' },
        { pct: 70, text: 'Adjusting formants for natural sound...' },
        { pct: 85, text: 'Polishing the output...' },
        { pct: 95, text: 'Almost done...' },
    ];

    let stepIndex = 0;
    const progressInterval = setInterval(() => {
        if (stepIndex < steps.length) {
            progressFill.style.width = steps[stepIndex].pct + '%';
            progressText.textContent = steps[stepIndex].text;
            stepIndex++;
        }
    }, 800);

    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('voice_id', selectedVoiceId);

    try {
        const response = await fetch('/api/convert', {
            method: 'POST',
            body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.detail || 'Conversion failed');
        }

        const result = await response.json();

        progressFill.style.width = '100%';
        progressText.textContent = 'Done!';

        setTimeout(() => {
            progress.classList.remove('show');
            showResult(result);
        }, 500);

    } catch (err) {
        clearInterval(progressInterval);
        progress.classList.remove('show');
        showToast(err.message || 'Conversion failed. Please try again.', 'error');
        convertBtn.disabled = false;
        convertBtn.textContent = 'Transform Voice Now';
    }
}

function showResult(result) {
    const resultSection = document.getElementById('resultSection');
    resultSection.classList.add('show');

    const origAudio = document.getElementById('originalAudio');
    document.getElementById('resultOriginal').src = origAudio.src;

    const convertedUrl = result.download_url;
    document.getElementById('resultConverted').src = convertedUrl;
    document.getElementById('resultVoiceName').textContent = result.voice_used;

    const downloadBtn = document.getElementById('downloadBtn');
    downloadBtn.href = convertedUrl;
    downloadBtn.download = `voicego_${result.voice_used.toLowerCase()}.wav`;

    document.getElementById('convertBtn').textContent = 'Transform Voice Now';
    document.getElementById('convertBtn').disabled = false;

    resultSection.scrollIntoView({ behavior: 'smooth' });
    showToast(`Voice converted to ${result.voice_used}!`, 'success');
}

function resetConverter() {
    document.getElementById('resultSection').classList.remove('show');
    document.getElementById('progressContainer').classList.remove('show');
    document.getElementById('convertBtn').textContent = 'Transform Voice Now';
    updateConvertButton();

    document.getElementById('convert').scrollIntoView({ behavior: 'smooth' });
}

/* ============ Toast Notifications ============ */

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

/* ============ Smooth Scrolling ============ */

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

/* ============ Initialize ============ */

updateConvertButton();
