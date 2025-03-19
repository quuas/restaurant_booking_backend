import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

export default function LoginScreen({ navigation }: any) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        try {
          const response = await axios.post<{ token: string }>('http://192.168.3.58:5000/login', { email, password });
          await AsyncStorage.setItem('token', response.data.token);
          navigation.replace('Main'); // Вместо navigate
        } catch (error) {
          Alert.alert('Ошибка', 'Ошибка сервера');
        }
      };
      

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Вход</Text>
            <TextInput 
                style={styles.input} 
                placeholder="Email" 
                value={email} 
                onChangeText={setEmail} 
                keyboardType="email-address"
            />
            <TextInput 
                style={styles.input} 
                placeholder="Пароль" 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry
            />
            <Button title="Войти" onPress={handleLogin} color="#007BFF" />
            <Text style={styles.link} onPress={() => navigation.navigate('Register')}>Регистрация</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#F5F5F5'
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 20
    },
    input: {
        width: '90%',
        height: 50,
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 15,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#ddd'
    },
    link: {
        color: '#007BFF',
        marginTop: 15,
        fontSize: 16
    }
});
