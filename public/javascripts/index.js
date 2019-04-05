window.addEventListener('online', updateOnline)
window.addEventListener('offline', updateOffline)

const status = document.getElementById('status')
status.innerText = 'Currently online'

function updateOnline() {
  console.log('online')
  status.innerText = 'Currently online'
}

function updateOffline() {
  console.log('offline')
  status.innerText = 'Currently offline'
}
