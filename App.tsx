import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import {supabase} from './utils/supabase';
import { storeSession, getSession, storeProfile, getProfile } from './utils/AsyncStorage';

export default function App() {
  const [profiles, setProfiles] = useState([])
  
  const consecSignIn = async () => {
    //get Profile
    const session = await getSession()
    if(!getProfile()){
      await supabase.from('Profiles').select('*').filter('id', 'eq', session.user.id).then((data) => {
        if (data.data) {
          storeProfile(data.data[0])
        }
        return data; // Add this line to return the data
      })
    }
    const profile = await getProfile()
    let connection_ids = [];
    if(profile.type === 'Caretaker'){
      const { data: connections, error } = await supabase
        .from('Connections')
        .select('senior_id')
        .eq('caretaker_id', profile.id);
        console.log(connections)
      connection_ids = connections?.map(connection => connection.senior_id) || [];
    }else{
      const { data: connections, error } = await supabase
        .from('Connections')
        .select('caretaker_id')
        .eq('senior_id', profile.id);
        console.log(connections)
      connection_ids = connections?.map(connection => connection.caretaker_id) || [];
    }
    const { data: profiles, error: profileError } = await supabase
    .from('Profiles')
    .select('*')
    .in('id', connection_ids);
    setProfiles(profiles || [])
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

  return (
    <View style={styles.container}>
      <Text>Open up App.tsx to start working on your app!</Text>
      <StatusBar style="auto" />
      <FlatList
      data={profiles}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
          <button>{item.full_name}</button>
      )}
      />
    </View>
    
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

