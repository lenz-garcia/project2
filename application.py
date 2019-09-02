import os

from flask import Flask, render_template, url_for, request
from flask_socketio import SocketIO, emit, join_room, leave_room, send

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY")
socketio = SocketIO(app)

userList = {}
channelList = []
channels = {}
curChannel = ''
limit = 100

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('add name')
def user(data):
    username = ''
    message = ''
    if data['username'] in userList:
        message = 'Username is taken. Please choose another one.'
    else:
        username = data['username']
        userList[data['username']]=request.sid
    emit("new name", {'username': username, 'message': message})

@socketio.on('add channel')
def channel(data):
    channel = ''
    message = ''
    if data['channel'] in channelList:
        message = 'Channel already exists. Please click it on the list of channels. Otherwise, input another channel name.'
        emit("new channel", {'channel': channel, 'message': message})
    else:
        channel = data['channel']
        channelList.append(data['channel'])
        channels[data['channel']] = []
        emit("new channel", {'channel': channel, 'message': message}, broadcast=True)

@socketio.on('join room')
def on_join(data):
    username = data['username']
    room = data['room']
    join_room(room)
    message = {'username': data['username'], 'text': 'entered the room', 'time': data['time']}
    channels[data['room']].append(message)
    if len(channels[data['room']]) > limit:
        channels[data['room']].pop(0)
    emit("room joined", {'channels': channels}, room=room)

@socketio.on('leave room')
def on_leave(data):
    username = data['username']
    room = data['room']
    leave_room(room)
    message = {'username': data['username'], 'text': 'left the room', 'time': data['time']}
    channels[data['room']].append(message)
    if len(channels[data['room']]) > limit:
        channels[data['room']].pop(0)
    emit("room joined", {'channels': channels}, room=room)

@socketio.on('load channels')
def load_channels(data):
    if data['curChannel'] is not None:
        curChannel = data['curChannel']
    else:
        curChannel = ''
    emit("channels loaded", {'channelList': channelList, 'curChannel': curChannel})

@socketio.on('clear storage')
def clear_storage(data):
    del userList[data['username']]
    emit("storage cleared")

@socketio.on('send message')
def send_message(data):
    message = {'username': data['username'], 'text': data['text'], 'time': data['time']}
    channels[data['channel']].append(message)
    room = data['channel']
    if len(channels[data['channel']]) > limit:
        channels[data['channel']].pop(0)
    emit("message sent", {'channels': channels}, room=room)

@socketio.on('delete message')
def clear_storage(data):
    room = data['channel']
    del channels[data['channel']][int(data['index'])]
    emit("message deleted", {'channels': channels}, room=room)

if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0")
