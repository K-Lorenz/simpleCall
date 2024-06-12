import AsyncStorage from "@react-native-async-storage/async-storage";

const storeSession = async (session: any) => {
  try {
    await AsyncStorage.setItem("supabaseSession", JSON.stringify(session));
  } catch (e) {
    console.error("Error storing session", e);
  }
};
const getSession = async () => {
  try {
    const sessionString = await AsyncStorage.getItem("supabaseSession");
    return sessionString ? JSON.parse(sessionString) : null;
  } catch (e) {
    console.error("Error getting session", e);
  }
};
const removeSession = async () => {
  try {
    await AsyncStorage.removeItem("supabaseSession");
  } catch (e) {
    console.error("Error removing session", e);
  }
};
const storeProfile = async (profile: any) => {
    try {
        await AsyncStorage.setItem("supabaseUser", JSON.stringify(profile));
    } catch (e) {
        console.error("Error storing user", e);
    }
}
const getProfile = async () => {
    try {
        const profileString = await AsyncStorage.getItem("supabaseUser");
        return profileString ? JSON.parse(profileString) : null;
    } catch (e) {
        console.error("Error getting user", e);
    }
}
const removeProfile = async () => {
    try {
        await AsyncStorage.removeItem("supabaseUser");
    } catch (e) {
        console.error("Error removing user", e);
    }
}

export { storeSession, getSession, removeSession, storeProfile, getProfile, removeProfile};