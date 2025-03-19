import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import axios from 'axios';
import { StackNavigationProp } from '@react-navigation/stack';

type RegisterScreenProps = {
    navigation: StackNavigationProp<any, any>;
};

export default function RegisterScreen({ navigation }: RegisterScreenProps) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');

    const handleRegister = async () => {
        try {
            await axios.post('http://localhost:5000/register', {
                name,
                email,
                phone,
                password,
                role: 'user',
            });
            Alert.alert('Успех', 'Регистрация завершена!');
            navigation.navigate('Login');
        } catch (error: any) {
            Alert.alert('Ошибка', error.response?.data?.error || 'Ошибка сервера');
        }
    };

    return (
        <View>
            <Text>Регистрация</Text>
            <TextInput placeholder="Имя" value={name} onChangeText={setName} />
            <TextInput placeholder="Email" value={email} onChangeText={setEmail} />
            <TextInput placeholder="Телефон" value={phone} onChangeText={setPhone} />
            <TextInput placeholder="Пароль" secureTextEntry value={password} onChangeText={setPassword} />
            <Button title="Зарегистрироваться" onPress={handleRegister} />
        </View>
    );
}
