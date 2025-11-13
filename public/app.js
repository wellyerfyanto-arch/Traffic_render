function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

// Manual Session Form
document.getElementById('sessionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        targetUrl: formData.get('targetUrl'),
        profiles: formData.get('profiles'),
        proxies: formData.get('proxies'),
        deviceType: formData.get('deviceType'),
        autoLoop: formData.get('autoLoop') === 'on',
        useOrganicTraffic: formData.get('useOrganicTraffic') === 'on',
        searchKeywords: formData.get('searchKeywords')
    };

    try {
        const response = await fetch('/api/start-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            addLog(`Session started: ${result.sessionId}`);
            if (result.organicTraffic) {
                addLog(`Organic traffic: ${result.organicTraffic.keyword}`);
            }
        } else {
            addLog(`Error: ${result.error}`);
        }
    } catch (error) {
        addLog(`Request failed: ${error.message}`);
    }
});

// Auto-Loop Form
document.getElementById('autoLoopForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        targetUrl: formData.get('targetUrl'),
        interval: parseInt(formData.get('interval')) * 60 * 1000,
        maxSessions: parseInt(formData.get('maxSessions')),
        useOrganicTraffic: formData.get('useOrganicTraffic') === 'on'
    };

    try {
        const response = await fetch('/api/auto-loop/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            updateAutoLoopStatus(result);
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert(`Request failed: ${error.message}`);
    }
});

document.getElementById('stopAutoLoop').addEventListener('click', async () => {
    try {
        const response = await fetch('/api/auto-loop/stop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const result = await response.json();
        if (result.success) {
            updateAutoLoopStatus({ config: { enabled: false } });
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert(`Request failed: ${error.message}`);
    }
});

// Monitoring
document.getElementById('refreshSessions').addEventListener('click', loadSessions);

function addLog(message) {
    const logs = document.getElementById('logs');
    const entry = document.createElement('div');
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logs.appendChild(entry);
    logs.scrollTop = logs.scrollHeight;
}

async function updateAutoLoopStatus(result) {
    const statusDiv = document.getElementById('autoLoopStatus');
    if (result.config.enabled) {
        statusDiv.innerHTML = `
            <div style="color: green;">
                <strong>Auto-Loop Running</strong><br>
                Interval: ${result.config.interval / 60000} minutes<br>
                Max Sessions: ${result.config.maxSessions}<br>
                Target URL: ${result.config.targetUrl}<br>
                Organic Traffic: ${result.config.useOrganicTraffic ? 'Enabled' : 'Disabled'}
            </div>
        `;
    } else {
        statusDiv.innerHTML = `<div style="color: red;"><strong>Auto-Loop Stopped</strong></div>`;
    }
}

async function loadSessions() {
    try {
        const response = await fetch('/api/all-sessions');
        const result = await response.json();
        
        if (result.success) {
            const sessionsList = document.getElementById('sessionsList');
            sessionsList.innerHTML = '';
            
            if (result.sessions.length === 0) {
                sessionsList.innerHTML = '<p>No active sessions</p>';
                return;
            }
            
            result.sessions.forEach(session => {
                const sessionDiv = document.createElement('div');
                sessionDiv.className = `session-item session-${session.status}`;
                
                const statusClass = `status-${session.status}`;
                
                sessionDiv.innerHTML = `
                    <div>
                        <span class="status-badge ${statusClass}">${session.status.toUpperCase()}</span>
                        <strong>Session ID:</strong> ${session.id}
                    </div>
                    <div><strong>Start Time:</strong> ${new Date(session.startTime).toLocaleString()}</div>
                    ${session.endTime ? `<div><strong>End Time:</strong> ${new Date(session.endTime).toLocaleString()}</div>` : ''}
                    <div><strong>Target URL:</strong> ${session.config.targetUrl}</div>
                    <div><strong>Organic Traffic:</strong> ${session.config.useOrganicTraffic ? 'Yes' : 'No'}</div>
                    <div><strong>Duration:</strong> ${session.config.visitDuration || 'Random'} seconds</div>
                    <div style="margin-top: 10px;">
                        <button onclick="stopSession('${session.id}')">Stop</button>
                        <button onclick="viewLogs('${session.id}')">View Logs</button>
                    </div>
                `;
                sessionsList.appendChild(sessionDiv);
            });
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
    }
}

async function stopSession(sessionId) {
    try {
        const response = await fetch(`/api/stop-session/${sessionId}`, {
            method: 'POST'
        });
        const result = await response.json();
        if (result.success) {
            loadSessions();
        } else {
            alert(`Error: ${result.error}`);
        }
    } catch (error) {
        alert(`Request failed: ${error.message}`);
    }
}

async function viewLogs(sessionId) {
    try {
        const response = await fetch(`/api/session-logs/${sessionId}`);
        const result = await response.json();
        if (result.success) {
            const logsWindow = window.open('', '_blank');
            logsWindow.document.write(`
                <html>
                    <head>
                        <title>Logs for ${sessionId}</title>
                        <style>
                            body { font-family: monospace; background: #1e1e1e; color: #00ff00; padding: 20px; }
                            pre { white-space: pre-wrap; }
                        </style>
                    </head>
                    <body>
                        <h1>Logs for ${sessionId}</h1>
                        <pre>${result.logs.map(log => `[${log.timestamp}] ${log.message}`).join('\n')}</pre>
                    </body>
                </html>
            `);
        }
    } catch (error) {
        alert(`Error: ${error.message}`);
    }
}

// Load auto-loop status on page load
fetch('/api/auto-loop/status')
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            updateAutoLoopStatus(result);
        }
    });

// Load sessions when Monitoring tab is opened
document.querySelector('.tablinks[onclick="openTab(event, \'Monitoring\')"]').addEventListener('click', loadSessions);
