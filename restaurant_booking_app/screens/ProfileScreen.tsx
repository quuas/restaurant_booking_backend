import React from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';

type ProfileScreenProps = {
    navigation: StackNavigationProp<any, any>;
};

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
    const handleLogout = async () => {
        await AsyncStorage.removeItem('token');
        navigation.replace('Login');
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Профиль</Text>
            <Button title="Выйти" onPress={handleLogout} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
    },
});
