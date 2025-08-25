document.addEventListener('DOMContentLoaded', () => {
    const authModal = document.getElementById('authModal');
    const authForm = document.getElementById('authForm');
    const authModalTitle = document.getElementById('authModalTitle');
    const authSubmit = document.getElementById('authSubmit');
    const switchToRegister = document.getElementById('switchToRegister');
    const authUsername = document.getElementById('authUsername');
    const authPassword = document.getElementById('authPassword');
    const mainContainer = document.querySelector('.container');

    let isRegisterMode = false;


    const token = localStorage.getItem('token');
    if (token) {
        // Optionally validate token with a backend call
        mainContainer.style.display = 'block';
        authModal.style.display = 'none';
        fetchDevices(); // Fetch devices if already logged in
    } else {
        authModal.style.display = 'block';
        mainContainer.style.display = 'none';
    }

    switchToRegister.addEventListener('click', (e) => {
        e.preventDefault();
        isRegisterMode = !isRegisterMode;
        if (isRegisterMode) {
            authModalTitle.textContent = 'Register';
            authSubmit.textContent = 'Register';
            switchToRegister.textContent = 'Login';
        } else {
            authModalTitle.textContent = 'Login';
            authSubmit.textContent = 'Login';
            switchToRegister.textContent = 'Register';
        }
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = authUsername.value;
        const password = authPassword.value;

        const url = isRegisterMode ? '/api/register' : '/api/login';

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                if (!isRegisterMode) { // If successfully logged in
                localStorage.setItem('token', data.token);
                authModal.style.display = 'none';
                mainContainer.style.display = 'block';
                fetchDevices(); // Fetch devices after successful login
            } else {
                alert(data.message); // Keep alert for registration
            }
                // If registered, switch to login mode
                isRegisterMode = false;
                authModalTitle.textContent = 'Login';
                authSubmit.textContent = 'Login';
                switchToRegister.textContent = 'Register';
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (error) {
            console.error('Authentication error:', error);
            alert('An error occurred during authentication.');
        }
    });
    const deviceModal = document.getElementById('deviceModal');
    const addDeviceBtn = document.getElementById('addDeviceBtn');
    const closeButton = document.querySelector('.close-button');
    const deviceForm = document.getElementById('deviceForm');
    const modalTitle = document.getElementById('modalTitle');
    const formSubmitBtn = document.getElementById('formSubmit');
    const deviceTableBody = document.getElementById('deviceTableBody');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    let devices = [];
    let editingId = null;

    // --- Modal Handling ---
    addDeviceBtn.onclick = () => {
        editingId = null;
        modalTitle.textContent = 'Add New Device';
        formSubmitBtn.textContent = 'Add Device';
        deviceForm.reset();
        document.getElementById('date').valueAsDate = new Date();
        deviceModal.style.display = 'block';
    };

    closeButton.onclick = () => {
        deviceModal.style.display = 'none';
    };

    window.onclick = (event) => {
        if (event.target == deviceModal) {
            deviceModal.style.display = 'none';
        }
    };

    // --- Form Submission ---
    deviceForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const deviceData = {
            customerName: document.getElementById('customerName').value,
            deviceName: document.getElementById('deviceName').value,
            amount: document.getElementById('amount').value,
            date: document.getElementById('date').value,
            status: document.querySelector('input[name="status"]:checked').value,
        };

        console.log('Device form submitted. Data:', deviceData);

        try {
            if (editingId) {
                await updateDevice(editingId, deviceData);
                await fetchDevices(); // Re-fetch all devices to ensure consistency after update
            } else {
                const newDevice = await addDevice(deviceData);
                console.log('New device added:', newDevice);
                // No need to fetchDevices() here, as addDevice already pushes the new device to the local array
            }

            renderDevices();
            deviceModal.style.display = 'none';
            editingId = null;
        } catch (error) {
            console.error('Error during device form submission:', error);
            alert('Failed to save device. Check console for details.');
        }
    });

    // --- Device Rendering and Filtering ---
    function renderDevices() {
        const searchTerm = searchInput.value.toLowerCase();
        const status = statusFilter.value;

        const filteredDevices = devices.filter(device => {
            const matchesSearch = device.customerName.toLowerCase().includes(searchTerm) ||
                                  device.deviceName.toLowerCase().includes(searchTerm);
            const matchesStatus = status === 'all' || device.status === status;
            return matchesSearch && matchesStatus;
        });

        deviceTableBody.innerHTML = '';
        filteredDevices.forEach(device => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${device.customerName}</td>
                <td>${device.deviceName}</td>
                <td>${device.amount}</td>
                <td><span class="status status-${device.status.toLowerCase().replace(' ', '-')}">${device.status}</span></td>
                <td class="date-column">${device.date}</td>
                <td>
                    <div class="action-buttons">
                        <button class="share-button" onclick="shareDevice(${device.id})">Share</button>
                        <button class="edit-button" onclick="editDevice(${device.id})">Edit</button>
                        <button class="delete-button" onclick="deleteDevice(${device.id})">Delete</button>
                    </div>
                </td>
            `;
            deviceTableBody.appendChild(row);


        });
    }

    // --- CRUD Functions ---
    window.shareDevice = async function(id) {
        const device = devices.find(d => d.id === id);
        if (!device) return;

        const message = `Device Details:\nCustomer: ${device.customerName}\nDevice: ${device.deviceName}\nAmount: ${device.amount}\nStatus: ${device.status}`;

        try {
            await navigator.clipboard.writeText(message);
            alert('Device details copied to clipboard!');

            if (navigator.share) {
                await navigator.share({
                    title: 'Device Details',
                    text: message,
                });
            }
        } catch (error) {
            console.error('Failed to share or copy:', error);
        }
    };

    window.editDevice = function(id) {
        const device = devices.find(d => d.id === id);
        if (!device) return;

        editingId = id;
        modalTitle.textContent = 'Edit Device';
        formSubmitBtn.textContent = 'Update Device';

        document.getElementById('customerName').value = device.customerName;
        document.getElementById('deviceName').value = device.deviceName;
        document.getElementById('amount').value = device.amount;
        document.getElementById('date').value = device.date;
        document.querySelector(`input[name='status'][value='${device.status}']`).checked = true;

        deviceModal.style.display = 'block';
    }

    window.deleteDevice = async function(id) {
        try {
            await fetch(`/api/devices/${id}`, {
                method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
            });
            await fetchDevices();
        } catch (error) {
            console.error('Failed to delete device:', error);
        }
    }


    async function fetchDevices() {
         try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No token found. User not authenticated.');
                return;
            }
             const response = await fetch('/api/devices', {
                 headers: {
                     'Authorization': `Bearer ${token}`
                 }
             });
            const data = await response.json();
            devices = Array.isArray(data) ? data : [];
            renderDevices();
        } catch (error) {
            console.error('Failed to fetch devices:', error);
            devices = [];
        }
    }

    async function addDevice(device) {
        try {
            const response = await fetch('/api/devices', {
                method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },      body: JSON.stringify(device),
            });
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}, message: ${data.message || JSON.stringify(data)}`);
            }
            const newDevice = data;
            devices.push(newDevice);
            return newDevice;
        } catch (error) {
            console.error('Failed to add device:', error);
            alert('Failed to add device. Check console for details.');
            throw error;
        }
    }

    async function updateDevice(id, device) {
        try {
            const response = await fetch(`/api/devices/${id}`, {
                method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },      body: JSON.stringify(device),
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const updatedDevice = await response.json();
            const index = devices.findIndex(d => d.id === id);
            if (index !== -1) {
                devices[index] = updatedDevice;
            }
            return updatedDevice;
        } catch (error) {
            console.error('Failed to update device:', error);
            throw error;
        }
    }

    // --- Initial Load ---
    fetchDevices();
    searchInput.addEventListener('input', renderDevices);
    statusFilter.addEventListener('change', renderDevices);
});