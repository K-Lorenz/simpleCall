import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import React from 'react';
import { Button, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { mediaDevices, registerGlobals, RTCIceCandidate, RTCPeerConnection, RTCSessionDescription, RTCView } from 'react-native-webrtc';

import SplitInput from './splitinputs';
import { getProfile, getSession, storeProfile, storeSession } from './utils/AsyncStorage';
import { supabase } from './utils/supabase';

let peerConstraints = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};
registerGlobals();
// Create Peer Connection
let peerConnection = new RTCPeerConnection(peerConstraints);

// Media constraints for audio only
let mediaConstraints = {
  audio: true,
  video: false
};

// Get local media stream
let localMediaStream;
async function getLocalMediaStream() {
  try {
    const mediaStream = await mediaDevices.getUserMedia(mediaConstraints);
    localMediaStream = mediaStream;
    localMediaStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localMediaStream);
    });
  } catch (err) {
    console.error('Error accessing media devices:', err);
  }
}

export default function App(){
  const [profiles, setProfiles] = useState([])
  const [profile, setProfile] = useState(null)
  const [text, onChangeText] = useState('')
  const getProfiles = async () => {
    let connection_ids = [];
    const localProfile = await getProfile()
    if(localProfile.type === 'Caretaker'){
      const { data: connections, error } = await supabase
        .from('Connections')
        .select('senior_id')
        .eq('caretaker_id', localProfile.id);
      connection_ids = connections?.map(connection => connection.senior_id) || [];
    }else{
      const { data: connections, error } = await supabase
        .from('Connections')
        .select('caretaker_id')
        .eq('senior_id', localProfile.id);
      connection_ids = connections?.map(connection => connection.caretaker_id) || [];
    }
    const { data: profiles, error: profileError } = await supabase
    .from('Profiles')
    .select('*')
    .in('id', connection_ids);
    setProfiles(profiles || [])
  }
    
  const consecSignIn = async () => {
    //get Profile
    const session = await getSession()
    const profile = await getProfile()
    if(!profile){
      await supabase.from('Profiles').select('*').filter('id', 'eq', session.user.id).then((data) => {
        if (data.data) {
          storeProfile(data.data[0])
        }
        return data; // Add this line to return the data
      })
    }
    setProfile(profile)
    getProfiles()
  }
  useEffect(() => {
    getSession().then((session) => {
      if (!session) {
        supabase.auth.signInAnonymously().then(({ data:{user, session}, error }) => {
          if (error) {
            console.error(error)
            return
          }
          storeSession(session)
          // first login
          // open profile creation page
          // supabase.from('Profiles').insert({id: user.id, username: 'Konrad', avatar_url: 'https://gravatar.com/avatar/1?d=identicon', type: 'Caretaker'}).then(({ data, error }) => { console.log(data, error); storeProfile(data[0]) })
        })
      } else{
        consecSignIn()
      }
    })

  }, [])

  const handleInputChange = (e:String) => {
    onChangeText(e.toUpperCase())
  }
  async function connectToSenior (seniorcode: String){
    onChangeText('')
    const self = await getProfile()
    if(seniorcode === self.connect_string){
      console.log('Cannot connect to yourself')
      return
    }
    const senior = await supabase.from('Profiles').select('*').filter('connect_string', 'eq', seniorcode).then(({ data, error }) => { console.log(data, error); return data[0] })
    await supabase.from('Connections').insert({caretaker_id: self.id, senior_id: senior.id}).then(({ data, error }) => { console.log(data, error); })
    getProfiles()
  }
  async function sendSignal(type, from, to, data){
    await supabase.from('IceCandidates').insert({type, from, to, data}).then(({ data, error }) => { console.log(data, error); })
  }
  async function listenForSignal(){
    const self = await getProfile()
    supabase.from('IceCandidates').on('INSERT', (payload) => {
      const { type, from, to, data } = payload.new
      if(to === self.id){
        onSignalReceived()
      }
    })
  }
  async function onSignalReceived(){
    const self = await getProfile()
    const { data: signals, error } = await supabase.from('IceCandidates').select('*').eq('to', self.id)
    signals.forEach(signal => {
      if(signal.type === 'offer'){
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data))
        peerConnection.createAnswer().then((answer) => {
          peerConnection.setLocalDescription(answer)
          sendSignal('answer', self.id, signal.from_id, answer)
        })
      }else if(signal.type === 'answer'){
        peerConnection.setRemoteDescription(new RTCSessionDescription(signal.data))
      }else if(signal.type === 'candidate'){
        peerConnection.addIceCandidate(new RTCIceCandidate(signal.data))
      }
    })
  }
async function createOffer(){
  const self = await getProfile()
  peerConnection.createOffer({}).then((offer) => {
    peerConnection.setLocalDescription(offer)
    sendSignal('offer', self.id, 'senior_id', offer)
  })
}
peerConnection.addEventListener( 'icecandidate', event => {
  if (event.candidate) {
    const self = getProfile().then((self) =>
    sendSignal('candidate', self.id, 'senior_id', event.candidate))
  }
} );
useEffect(() => {
  getLocalMediaStream()
  listenForSignal()
}, [])

return (
<View style={styles.container}>
      <Text style={styles.header}>Welcome to the App!</Text>
      <StatusBar style="auto" />
      <RTCView streamURL={localMediaStream?.toURL()} style={{ width: 200, height: 200 }} />
      <FlatList
        style={styles.list}
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Button title={item.full_name} onPress={() => console.log(`Selected ${item.full_name}`)} />
        )}
      />
      <Text style={styles.connectString}>User Connection String: {profile?.connect_string}</Text>
      <SplitInput value={text} onChangeText={handleInputChange} />
      <Button title="Connect to Senior" onPress={() => connectToSenior(text)} />
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  list: {
    width: '100%',
    marginBottom: 20,
  },
  connectString: {
    fontSize: 16,
    marginBottom: 20,
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 20,
    paddingHorizontal: 10,
    width: '100%',
  },
});