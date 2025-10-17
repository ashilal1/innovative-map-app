const map = L.map('map').setView([35.6812, 139.7671], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let clickedLatLng = null;

const overlay = document.getElementById('overlay');
const formContainer = document.getElementById('formContainer');
const titleInput = document.getElementById('titleInput');
const commentInput = document.getElementById('commentInput');
const imageInput = document.getElementById('imageInput');
const addBtn = document.getElementById('addBtn');
const cancelBtn = document.getElementById('cancelBtn');

map.on('click', function(e) {
  clickedLatLng = e.latlng;
  overlay.style.display = 'block';
  formContainer.style.display = 'block';
});

cancelBtn.addEventListener('click', () => {
  overlay.style.display = 'none';
  formContainer.style.display = 'none';
  titleInput.value = '';
  commentInput.value = '';
  imageInput.value = '';
});

addBtn.addEventListener('click', () => {
  if (!clickedLatLng) return;

  const title = titleInput.value.trim();
  const comment = commentInput.value.trim();
  const file = imageInput.files[0];

  if (!title && !comment && !file) {
    alert('何か入力してください');
    return;
  }

  let imageHTML = '';
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      imageHTML = `<img src="${e.target.result}" width="150"><br>`;
      addMarker(title, comment, imageHTML);
    };
    reader.readAsDataURL(file);
  } else {
    addMarker(title, comment, imageHTML);
  }

  overlay.style.display = 'none';
  formContainer.style.display = 'none';
  titleInput.value = '';
  commentInput.value = '';
  imageInput.value = '';
});

function addMarker(title, comment, imageHTML) {
  const popupHTML = `<b>${title}</b><br>${imageHTML}${comment}`;
  L.marker([clickedLatLng.lat, clickedLatLng.lng])
    .addTo(map)
    .bindPopup(popupHTML);
}
