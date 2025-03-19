import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { StackNavigationProp } from '@react-navigation/stack';

type LoginScreenProps = {
    navigation: StackNavigationProp<any, any>;
};

export default function LoginScreen({ navigation }: LoginScreenProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async () => {
        try {
            const response = await axios.post<{ token: string }>('http://localhost:5000/login', { email, password });
            await AsyncStorage.setItem('token', response.data.token);
            navigation.replace('Main');
        } catch (error: any) {
            Alert.alert('Ошибка', error.response?.data?.error || 'Ошибка сервера');
        }
    };

    return (
        <View>
            <Text>Вход</Text>
            <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
            <TextInput placeholder="Пароль" secureTextEntry value={password} onChangeText={setPassword} />
            <Button title="Войти" onPress={handleLogin} />
            <Button title="Регистрация" onPress={() => navigation.navigate('Register')} />
        </View>
    );
}
