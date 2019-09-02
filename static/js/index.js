document.addEventListener('DOMContentLoaded', () => {

  let username = localStorage.getItem('username');
  let curChannel = localStorage.getItem('curChannel');

  // validation for modal-input
  document.querySelector('#modal-input').onkeydown = function (e) {
    let str = this.value.trim();
    if (str.length > 0) {
      document.querySelector('#modal-submit').disabled = false;
      if(e.keyCode === 13) {
          document.querySelector('#modal-submit').click();
      }
    }
    else{
      document.querySelector('#modal-submit').disabled = true;
    }
  };

  // submit modal-input
  document.querySelector('#modal-submit').onclick = function () {
    if(!username){
      socket.emit('add name', {'username': document.querySelector('#modal-input').value.trim()});
    }
    else{
      socket.emit('add channel', {'channel': document.querySelector('#modal-input').value.trim()});
    }
  };

  // add channel
  document.querySelector("button[name='add-channel']").onclick = function () {
    $('#myModal').modal({backdrop: true, keyboard: true});
    $('.modal-title').text('Input channel name:');
    setTimeout(function(){
      document.querySelector('#modal-input').focus();
    }, 500);
  };

  // clear localStorage username, curChannel
  document.querySelector("button[name='clear-storage']").onclick = function () {
    socket.emit('clear storage', {'username': username});
  };

  // validation for message-text
  document.querySelector('#message-text').onkeydown = function (e) {
    let str = this.value.trim();
    if (str.length > 0) {
      document.querySelector('#message-send').disabled = false;
      if(e.keyCode === 13) {
          document.querySelector('#message-send').click();
      }
    }
    else{
      document.querySelector('#message-send').disabled = true;
    }
  };

  // submit message
  document.querySelector('#message-send').onclick = function () {
    if(!curChannel){
      alert('Please choose a channel from the list of channels.');
    }
    else{
      var date = new Date();
      var iso = date.toISOString().match(/(\d{4}\-\d{2}\-\d{2})T(\d{2}:\d{2}:\d{2})/);

      socket.emit('send message', {'channel': curChannel, 'username': username, 'time': iso[1]+' '+iso[2] ,'text': document.querySelector('#message-text').value});
    }
  };

  // Connect to websocket
  var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

  // When connected, configure buttons
  socket.on('connect', () => {
    // Check if user credentials are in local storage
    if(!username){
      $('#myModal').modal({backdrop: true, keyboard: false});
      $('.modal-title').text('Input your name:');
      setTimeout(function(){
        document.querySelector('#modal-input').focus();
      }, 500);
    }
    document.querySelector('.username').innerHTML = username;
    document.querySelector("button[name='clear-storage']").style.display = 'block';

    // load channelList
    socket.emit('load channels', {'curChannel': curChannel});

  });

  // Add name on client-side
  socket.on('new name', data => {
    if(data['message']==''){
      document.querySelector("button[name='clear-storage']").style.display = 'block';
      localStorage.setItem('username', data['username']);
      username = data['username'];
      document.querySelector('.alert-danger').style.display = 'none';
      document.querySelector('#modal-input').value = '';
      document.querySelector('#modal-submit').disabled = false;
      document.querySelector('.username').innerHTML = username;
    }
    else{
      setTimeout(function(){
        document.querySelector('.alert-danger').innerHTML = data['message'];
        document.querySelector('.alert-danger').style.display = 'block';
        $('#myModal').modal({backdrop: true, keyboard: false});
      }, 500);
      setTimeout(function(){
        document.querySelector('#modal-input').focus();
      }, 900);
    }
  });

  // Add channel on client-side
  socket.on('new channel', data => {
    if(data['message']==''){
      document.querySelector('.alert-danger').style.display = 'none';
      document.querySelector('#modal-input').value = '';
      document.querySelector('#modal-submit').disabled = false;
      createChannel(data['channel']);
    }
    else{
      setTimeout(function(){
        document.querySelector('.alert-danger').innerHTML = data['message'];
        document.querySelector('.alert-danger').style.display = 'block';
        $('#myModal').modal({backdrop: true, keyboard: false});
      }, 500);
      setTimeout(function(){
        document.querySelector('#modal-input').focus();
      }, 900);
    }
  });

  // Load channels on client-side
  socket.on('channels loaded', data => {
      data['channelList'].forEach(function (item) {
        createChannel(item)
      });

      if(data['curChannel']){
        document.querySelector(`li[data-channel='${data['curChannel']}']`).click()
      }
  });

  // Clear localStorage on client-side
  socket.on('storage cleared', () => {
    document.querySelector("button[name='clear-storage']").style.display = 'block';
    localStorage.clear();
    alert('Local storage is cleared.');
    window.location.reload();
  });

  // Clear message on client-side
  socket.on('message sent', data => {
    document.querySelector('#message-text').value = '';
    document.querySelector('#message-text').focus();
    loadMessages(data);
  });

  // emit joined status
  socket.on('room joined', data => {
    loadMessages(data);
  });

  // emit joined status
  socket.on('message deleted', data => {
    loadMessages(data);
  });

  function createChannel(name) {
    const li = document.createElement('li');
    li.innerHTML = `${name}`;
    li.setAttribute('data-channel', `${name}`);
    li.onclick = function () {
      let n = localStorage.getItem('curChannel');
      var date = new Date();
      var iso = date.toISOString().match(/(\d{4}\-\d{2}\-\d{2})T(\d{2}:\d{2}:\d{2})/);
      if (this.innerHTML != `${n}`) {
        let x = document.querySelector('.active');
        if(x){
          x.disabled = false;
          x.className = '';
          socket.emit('leave room', {'username': username, 'room': n, 'time': iso[1]+' '+iso[2]});
        }
        this.disabled = true;
        this.className = 'active';
        curChannel = name;
        localStorage.setItem('curChannel', curChannel);
        socket.emit('join room', {'username': username, 'room': name, 'time': iso[1]+' '+iso[2]});
      }
      else if (this.innerHTML == `${n}` && !document.querySelector('.active')) {
        this.disabled = true;
        this.className = 'active';
        curChannel = name;
        localStorage.setItem('curChannel', curChannel);
        socket.emit('join room', {'username': username, 'room': name, 'time': iso[1]+' '+iso[2]});
      }
    };
    document.querySelector('.channelList').append(li);
  }

  function loadMessages(data) {
    document.querySelector('.msgs').innerHTML = ''
    for (x in data['channels'][curChannel]) {
      const box = document.createElement('div');
      const msgBody = document.createElement('p');
      const msgSenderDT = document.createElement('small');

      if (data['channels'][curChannel][x]['username']==username) {
        box.className = 'box right';
      }
      else {
        box.className = 'box';
      }

      msgBody.innerHTML = data['channels'][curChannel][x]['text'];
      msgSenderDT.innerHTML = '<b>'+data['channels'][curChannel][x]['username']+'</b> &nbsp;'+data['channels'][curChannel][x]['time']+'&nbsp;';

      $('.msgs').append(box);
      box.append(msgBody);
      box.append(msgSenderDT);

      if (data['channels'][curChannel][x]['username'] == username && !(data['channels'][curChannel][x]['text'] == 'left the room' || data['channels'][curChannel][x]['text'] == 'entered the room')) {
        const icon = document.createElement('i');
        icon.className = 'fa fa-trash';
        icon.onclick = function () {
          let parentBox = this.parentElement.parentElement;
          parentBox.style.opacity = '0';
          setTimeout(function(){
            parentBox.className += ' remove';
            parentBox.style.height = parentBox.offsetHeight+'px';
          }, 500);
          setTimeout(function(){ parentBox.style.height = '0'; }, 600);
          setTimeout(function(){ parentBox.remove(); }, 1100);
          setTimeout(function(){ socket.emit('delete message', {'channel': curChannel, 'index': x}); }, 1300);
        };
        msgSenderDT.append(icon);
      }

      $('.msgs').scrollTop(100000);
    }
  }

});
