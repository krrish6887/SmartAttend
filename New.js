// Main JavaScript file for Smart Attendance System (new.js)

// Global variables
let stream = null;
let faceDetectionInterval = null;
let isAttendanceActive = false;
let currentPosition = null;
let faceRecognitionActive = false;
let registeredFaces = {};
let currentUser = null;
let classLocations = {
  "CS301": { lat: 37.7749, lng: -122.4194, radius: 100, building: "Campus Building 3" },
  "CS201": { lat: 37.7746, lng: -122.4189, radius: 100, building: "Campus Building 2" },
  "CS401": { lat: 37.7751, lng: -122.4191, radius: 100, building: "Campus Building 4" },
  "CS302": { lat: 37.7747, lng: -122.4192, radius: 100, building: "Campus Building 1" }
};

// DOM Elements
document.addEventListener('DOMContentLoaded', function() {
  // Navigation and Modal Controls
  const loginBtn = document.querySelector('.auth-buttons .btn-outlined');
  const demoBtn = document.querySelector('.auth-buttons .btn-primary');
  const getStartedBtn = document.querySelector('.hero-content .btn-primary');
  const scheduleDemoBtn = document.querySelector('.cta-buttons .btn-light');
  const contactSalesBtn = document.querySelector('.cta-buttons .btn-outlined-light');
  const loginModal = document.getElementById('loginModal');
  const closeModalBtn = document.querySelector('.close-modal');
  const studentLoginTab = document.querySelector('.tab:nth-child(1)');
  const professorLoginTab = document.querySelector('.tab:nth-child(2)');
  const studentLoginForm = document.getElementById('studentLogin');
  const professorLoginForm = document.getElementById('professorLogin');
  
  // Demo elements
  const demoFrame = document.querySelector('.demo-frame');
  const cameraView = document.querySelector('.camera-view');
  const statusIndicators = document.querySelectorAll('.status-indicator');
  
  // Initialize event listeners
  initEventListeners();
  
  // Check for geolocation support
  if (navigator.geolocation) {
    startGeolocationTracking();
  } else {
    console.error("Geolocation is not supported by this browser.");
  }
  
  // Initialize the Face API (using Face-API.js library)
  initFaceAPI();
  
  // Functions
  function initEventListeners() {
    // Modal event listeners
    if (loginBtn) {
      loginBtn.addEventListener('click', openLoginModal);
    }
    
    if (demoBtn) {
      demoBtn.addEventListener('click', startDemo);
    }
    
    if (getStartedBtn) {
      getStartedBtn.addEventListener('click', scrollToDemo);
    }
    
    if (scheduleDemoBtn) {
      scheduleDemoBtn.addEventListener('click', openContactForm);
    }
    
    if (contactSalesBtn) {
      contactSalesBtn.addEventListener('click', openContactForm);
    }
    
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', closeLoginModal);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
      if (e.target === loginModal) {
        closeLoginModal();
      }
    });
    
    // Tab switching
    if (studentLoginTab && professorLoginTab) {
      studentLoginTab.addEventListener('click', function() {
        switchTab(this, 'studentLogin');
      });
      
      professorLoginTab.addEventListener('click', function() {
        switchTab(this, 'professorLogin');
      });
    }
    
    // Form submissions
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleLogin(e);
      });
    });
  }
  
  // Geolocation functions
  function startGeolocationTracking() {
    if (navigator.geolocation) {
      navigator.geolocation.watchPosition(
        updatePosition,
        handleGeolocationError,
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
      );
    }
  }
  
  function updatePosition(position) {
    currentPosition = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy
    };
    
    // Update location status if demo is active
    if (isAttendanceActive) {
      verifyLocation();
    }
  }
  
  function handleGeolocationError(error) {
    console.error("Geolocation error occurred. Error code: " + error.code);
    // Error codes: 
    // 0: unknown error
    // 1: permission denied
    // 2: position unavailable (error response from location provider)
    // 3: timed out
    
    let errorMessage = "Unable to access your location. ";
    
    switch(error.code) {
      case 1:
        errorMessage += "Please enable location services for this website.";
        break;
      case 2:
        errorMessage += "Location information is unavailable.";
        break;
      case 3:
        errorMessage += "The request to get user location timed out.";
        break;
      default:
        errorMessage += "An unknown error occurred.";
        break;
    }
    
    if (statusIndicators && statusIndicators[1]) {
      const locationIndicator = statusIndicators[1].querySelector('.indicator');
      locationIndicator.classList.remove('active');
      locationIndicator.classList.add('inactive');
      statusIndicators[1].querySelector('span').textContent = errorMessage;
    }
  }
  
  function verifyLocation() {
    if (!currentPosition || !currentUser) return;
    
    // Find the active class for the user
    const activeClass = "CS301"; // This would come from the active session
    const classLocation = classLocations[activeClass];
    
    if (!classLocation) return;
    
    const distance = calculateDistance(
      currentPosition.lat, 
      currentPosition.lng, 
      classLocation.lat, 
      classLocation.lng
    );
    
    // Update location indicator
    if (statusIndicators && statusIndicators[1]) {
      const locationIndicator = statusIndicators[1].querySelector('.indicator');
      const locationText = statusIndicators[1].querySelector('span');
      
      if (distance <= classLocation.radius) {
        locationIndicator.classList.remove('inactive');
        locationIndicator.classList.add('active');
        locationText.textContent = `Location verified (${classLocation.building})`;
        return true;
      } else {
        locationIndicator.classList.remove('active');
        locationIndicator.classList.add('inactive');
        locationText.textContent = `Not in class location. Distance: ${Math.round(distance)}m from ${classLocation.building}`;
        return false;
      }
    }
    
    return false;
  }
  
  // Calculate distance between two coordinates in meters (Haversine formula)
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
  }
  
  // Face API integration
  async function initFaceAPI() {
    // In a real implementation, we would load the face-api.js library here
    // For demo purposes, we'll simulate the API
    console.log("Initializing Face Recognition API...");
    
    // Simulating loading models
    await simulateAsyncOperation(1000);
    console.log("Face detection models loaded");
    
    // Load mock registered faces
    loadMockFaceData();
  }
  
  function loadMockFaceData() {
    // In a real application, this would load from a secure database
    registeredFaces = {
      "STU10001": { name: "John Smith", faceData: "face_encoding_1" },
      "STU10002": { name: "Emily Johnson", faceData: "face_encoding_2" },
      "STU10003": { name: "Michael Brown", faceData: "face_encoding_3" },
      "PROF5001": { name: "Dr. Sarah Johnson", faceData: "face_encoding_4" }
    };
  }
  
  async function startFaceDetection(videoElement) {
    if (!videoElement) return;
    
    // Start the camera
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoElement.srcObject = stream;
      videoElement.style.display = 'block';
      videoElement.play();
      
      // Update face detection indicator
      if (statusIndicators && statusIndicators[0]) {
        const faceIndicator = statusIndicators[0].querySelector('.indicator');
        faceIndicator.classList.remove('inactive');
        faceIndicator.classList.add('active');
        statusIndicators[0].querySelector('span').textContent = "Face detected";
      }
      
      // Start face detection interval
      faceRecognitionActive = true;
      faceDetectionInterval = setInterval(detectFace, 1000);
      
    } catch (error) {
      console.error("Error accessing camera:", error);
      if (statusIndicators && statusIndicators[0]) {
        const faceIndicator = statusIndicators[0].querySelector('.indicator');
        faceIndicator.classList.remove('active');
        faceIndicator.classList.add('inactive');
        statusIndicators[0].querySelector('span').textContent = "Camera access denied";
      }
    }
  }
  
  function stopFaceDetection() {
    faceRecognitionActive = false;
    clearInterval(faceDetectionInterval);
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    
    // Update indicators
    if (statusIndicators) {
      statusIndicators.forEach(indicator => {
        const dot = indicator.querySelector('.indicator');
        dot.classList.remove('active');
        dot.classList.add('inactive');
      });
      
      if (statusIndicators[0]) {
        statusIndicators[0].querySelector('span').textContent = "Face detection stopped";
      }
      
      if (statusIndicators[2]) {
        statusIndicators[2].querySelector('span').textContent = "Attendance recording stopped";
      }
    }
  }
  
  async function detectFace() {
    if (!faceRecognitionActive) return;
    
    // In a real implementation, this would use face-api.js to detect faces
    // For demo purposes, we'll simulate detection
    
    // Simulate processing delay
    await simulateAsyncOperation(500);
    
    // Update status indicators for demo
    if (statusIndicators) {
      // Face detection status
      if (statusIndicators[0]) {
        const randomSuccess = Math.random() > 0.1; // 90% success rate for demo
        const faceIndicator = statusIndicators[0].querySelector('.indicator');
        
        if (randomSuccess) {
          faceIndicator.classList.remove('inactive');
          faceIndicator.classList.add('active');
          statusIndicators[0].querySelector('span').textContent = "Face detected";
          
          // If location is also verified, update attendance status
          if (verifyLocation()) {
            if (statusIndicators[2]) {
              const attendanceIndicator = statusIndicators[2].querySelector('.indicator');
              attendanceIndicator.classList.remove('inactive');
              attendanceIndicator.classList.add('active');
              statusIndicators[2].querySelector('span').textContent = "Attendance recorded successfully";
              
              // In a real app, this would make an API call to record attendance
              console.log("Attendance recorded for user:", currentUser);
            }
          }
        } else {
          faceIndicator.classList.remove('active');
          faceIndicator.classList.add('inactive');
          statusIndicators[0].querySelector('span').textContent = "Face not detected clearly";
          
          // Reset attendance status
          if (statusIndicators[2]) {
            const attendanceIndicator = statusIndicators[2].querySelector('.indicator');
            attendanceIndicator.classList.remove('active');
            attendanceIndicator.classList.add('inactive');
            statusIndicators[2].querySelector('span').textContent = "Waiting for face verification...";
          }
        }
      }
    }
  }
  
  async function registerFace(videoElement, userId) {
    if (!videoElement || !userId) return false;
    
    try {
      // In a real implementation, this would capture face data and send to server
      // For demo, we'll simulate the process
      
      // Simulate processing
      await simulateAsyncOperation(2000);
      
      // Add to mock database
      registeredFaces[userId] = {
        name: "New User",
        faceData: "new_face_encoding_" + Date.now()
      };
      
      return true;
    } catch (error) {
      console.error("Error registering face:", error);
      return false;
    }
  }
  
  // UI Functions
  function openLoginModal() {
    if (loginModal) {
      loginModal.style.display = 'flex';
    }
  }
  
  function closeLoginModal() {
    if (loginModal) {
      loginModal.style.display = 'none';
    }
  }
  
  function switchTab(tabElement, formId) {
    // Deactivate all tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Activate selected tab
    tabElement.classList.add('active');
    
    // Hide all forms
    const forms = document.querySelectorAll('#studentLogin, #professorLogin');
    forms.forEach(form => form.style.display = 'none');
    
    // Show selected form
    const selectedForm = document.getElementById(formId);
    if (selectedForm) {
      selectedForm.style.display = 'block';
    }
  }
  
  function startDemo() {
    // Activate demo mode in the demo section
    isAttendanceActive = true;
    
    // Find the camera view in the demo section
    const demoCameraView = document.querySelector('.camera-view');
    
    if (demoCameraView) {
      // Clear the placeholder text
      demoCameraView.innerHTML = '';
      
      // Create a video element for the camera feed
      const videoElement = document.createElement('video');
      videoElement.id = 'demoVideo';
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      demoCameraView.appendChild(videoElement);
      
      // Add face outline
      const faceOutline = document.createElement('div');
      faceOutline.className = 'face-outline';
      demoCameraView.appendChild(faceOutline);
      
      // Start face detection
      startFaceDetection(videoElement);
      
      // Set demo user
      currentUser = {
        id: "STU10001",
        name: "John Smith",
        role: "student"
      };
      
      // Scroll to demo section
      scrollToDemo();
    }
  }
  
  function scrollToDemo() {
    const demoSection = document.getElementById('demo');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' });
    }
  }
  
  function handleLogin(event) {
    event.preventDefault();
    const form = event.target;
    let userId = "";
    
    // Determine which form was submitted
    if (form.querySelector('#studentId')) {
      userId = form.querySelector('#studentId').value;
      currentUser = {
        id: userId,
        name: registeredFaces[userId] ? registeredFaces[userId].name : "Student User",
        role: "student"
      };
    } else if (form.querySelector('#professorId')) {
      userId = form.querySelector('#professorId').value;
      currentUser = {
        id: userId,
        name: registeredFaces[userId] ? registeredFaces[userId].name : "Professor User",
        role: "professor"
      };
    }
    
    // Close login modal
    closeLoginModal();
    
    // In a real app, this would redirect to dashboard
    alert(`Logged in successfully as ${currentUser.name} (${currentUser.role})`);
    
    // For demo purposes, redirect to the demo section
    startDemo();
  }
  
  function openContactForm() {
    alert("Contact form would open here. In a real implementation, this would show a form to collect contact information.");
  }
  
  // Utility Functions
  function simulateAsyncOperation(delay) {
    return new Promise(resolve => setTimeout(resolve, delay));
  }
  // Anime.js animations on load
  anime({
    targets: '.hero-title',
    translateY: [-50, 0],
    opacity: [0, 1],
    duration: 1200,
    easing: 'easeOutExpo'
  });

  anime({
    targets: '.hero p',
    delay: 300,
    translateY: [50, 0],
    opacity: [0, 1],
    duration: 1000,
    easing: 'easeOutExpo'
  });

  anime({
    targets: '.animate-cta',
    scale: [0.8, 1],
    opacity: [0, 1],
    delay: 600,
    duration: 900,
    easing: 'easeOutBack'
  });

  anime({
    targets: '.feature-card',
    translateY: [30, 0],
    opacity: [0, 1],
    delay: anime.stagger(150, { start: 500 }),
    easing: 'easeOutCubic',
    duration: 800
  });

  anime({
    targets: '.step',
    translateX: [-20, 0],
    opacity: [0, 1],
    delay: anime.stagger(200, { start: 1000 }),
    easing: 'easeOutQuart',
    duration: 800
  });
});

// Global functions for HTML onclick attributes
function openLoginModal() {
  const loginModal = document.getElementById('loginModal');
  if (loginModal) {
    loginModal.style.display = 'flex';
  }
}

function closeLoginModal() {
  const loginModal = document.getElementById('loginModal');
  if (loginModal) {
    loginModal.style.display = 'none';
  }
}

function switchTab(element, formId) {
  // Deactivate all tabs
  const tabs = document.querySelectorAll('.tab');
  tabs.forEach(tab => tab.classList.remove('active'));
  
  // Activate selected tab
  element.classList.add('active');
  
  // Hide all forms
  document.getElementById('studentLogin').style.display = 'none';
  document.getElementById('professorLogin').style.display = 'none';
  
  // Show selected form
  document.getElementById(formId).style.display = 'block';
}

// Additional class for handling attendance records
class AttendanceSystem {
  constructor() {
    this.attendanceRecords = {};
    this.activeSessions = {};
  }
  
  startSession(classId, professor) {
    const sessionId = `${classId}_${Date.now()}`;
    this.activeSessions[sessionId] = {
      classId,
      professor,
      startTime: new Date(),
      endTime: null,
      students: {}
    };
    return sessionId;
  }
  
  endSession(sessionId) {
    if (this.activeSessions[sessionId]) {
      this.activeSessions[sessionId].endTime = new Date();
      
      // Archive the session
      this.attendanceRecords[sessionId] = this.activeSessions[sessionId];
      
      // Remove from active sessions
      delete this.activeSessions[sessionId];
      
      return true;
    }
    return false;
  }
  
  markAttendance(sessionId, studentId, geoLocation) {
    if (!this.activeSessions[sessionId]) return false;
    
    this.activeSessions[sessionId].students[studentId] = {
      timeIn: new Date(),
      location: geoLocation,
      status: this.determineStatus(this.activeSessions[sessionId].startTime, new Date())
    };
    
    return true;
  }
  
  determineStatus(sessionStartTime, studentTimeIn) {
    // Calculate minutes late
    const minutesLate = Math.floor((studentTimeIn - sessionStartTime) / 60000);
    
    if (minutesLate <= 5) return "Present";
    if (minutesLate <= 15) return "Late";
    return "Very Late";
  }
  
  getSessionReport(sessionId) {
    const session = this.attendanceRecords[sessionId] || this.activeSessions[sessionId];
    if (!session) return null;
    
    const presentCount = Object.values(session.students)
      .filter(s => s.status === "Present").length;
    
    const lateCount = Object.values(session.students)
      .filter(s => s.status === "Late").length;
    
    const veryLateCount = Object.values(session.students)
      .filter(s => s.status === "Very Late").length;
    
    const totalRegistered = 40; // This would come from a database in a real app
    const absentCount = totalRegistered - (presentCount + lateCount + veryLateCount);
    
    return {
      classId: session.classId,
      date: session.startTime.toLocaleDateString(),
      startTime: session.startTime.toLocaleTimeString(),
      endTime: session.endTime ? session.endTime.toLocaleTimeString() : "In Progress",
      presentCount,
      lateCount,
      veryLateCount,
      absentCount,
      attendanceRate: ((presentCount + lateCount + veryLateCount) / totalRegistered * 100).toFixed(1)
    };
  }
  
  generateWeeklyReport(classId) {
    // In a real app, this would query a database
    // For demo, we'll generate mock data
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const report = days.map(day => {
      return {
        day,
        presentCount: Math.floor(Math.random() * 15) + 25, // 25-40 students
        totalCount: 40,
        date: new Date().toLocaleDateString()
      };
    });
    
    return report;
  }
}

// Initialize the attendance system
const attendanceSystem = new AttendanceSystem();
