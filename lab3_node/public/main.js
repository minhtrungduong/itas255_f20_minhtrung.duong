// croftd - experimenting with adding listeners to buttons 
// for asynchronous calls - currently not being used (or not useful)!
// Similar to the older XMLHttpRequest / AJAX call...

var testButton = document.getElementById('test')

testButton.addEventListener('click', function () {

  // note - for this to work you will need to set
  // a property value="id" on the button
  var id = testButton.value;

  fetch('test', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      // pass the id to the test function
      // e.g.
      'id': id
    })
  })
  .then(res => {
    if (res.ok) return res.json()
  })
  .then(data => {
    console.log(data)
    window.location.reload()
  })
});
