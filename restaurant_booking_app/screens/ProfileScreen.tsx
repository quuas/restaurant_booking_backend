import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

interface UserProfile {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role: string;
}

interface Booking {
    id: number;
    restaurant_name: string;
    table_number: number;
    reservation_time: string;
}

export default function ProfileScreen({ navigation }: any) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchUserData = async () => {
        setLoading(true);
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        try {
            const response = await axios.get<{ user: UserProfile; bookings: Booking[] }>(
                'http://192.168.3.58:5000/profile',
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setUser(response.data.user);
            setBookings(response.data.bookings);
        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
            Alert.alert('Ошибка', 'Не удалось загрузить профиль.');
        }
        setLoading(false);
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', fetchUserData);
        return unsubscribe;
    }, [navigation]);

    const handleLogout = async () => {
        await AsyncStorage.removeItem('token');
        navigation.replace('Login');
    };

    const handleCancelBooking = async (bookingId: number) => {
        const token = await AsyncStorage.getItem('token');
    
        if (!token) {
            Alert.alert('Ошибка', 'Вы не авторизованы.');
            return;
        }
    
        try {
            await axios.delete(`http://192.168.3.58:5000/bookings/${bookingId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
    
            Alert.alert('Успех', 'Бронирование отменено.');
            setBookings(bookings.filter(b => b.id !== bookingId)); // Удаляем из списка
        } catch (error) {
            console.error('Ошибка отмены бронирования:', error);
            Alert.alert('Ошибка', 'Не удалось отменить бронь.');
        }
    };
    

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Профиль</Text>
            {user && (
                <View style={styles.userInfo}>
                    <Text style={styles.userText}>Имя: {user.name}</Text>
                    <Text style={styles.userText}>Email: {user.email}</Text>
                    {user.phone && <Text style={styles.userText}>Телефон: {user.phone}</Text>}
                </View>
            )}

            <Text style={styles.subHeader}>Ваши бронирования:</Text>
            
            <TouchableOpacity style={styles.refreshButton} onPress={fetchUserData}>
                <Text style={styles.refreshButtonText}>{loading ? 'Обновление...' : '🔄 Обновить бронирования'}</Text>
            </TouchableOpacity>

            {bookings.length > 0 ? (
                <FlatList
                    data={bookings}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={({ item }) => (
                        <View style={styles.bookingItem}>
                            <Text style={styles.bookingText}>
                                {item.restaurant_name} - {new Date(item.reservation_time).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}
                            </Text>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancelBooking(item.id)}>
                                <Text style={styles.cancelButtonText}>Отменить</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            ) : (
                <Text style={styles.noBookings}>Нет активных бронирований</Text>
            )}

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutButtonText}>Выйти</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f9f9f9',
    },
    header: {
        fontSize: 26,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 15,
    },
    userInfo: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
    },
    userText: {
        fontSize: 16,
        marginBottom: 5,
    },
    subHeader: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    refreshButton: {
        backgroundColor: '#3498db',
        padding: 10,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 10,
    },
    refreshButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    bookingItem: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bookingText: {
        fontSize: 16,
    },
    cancelButton: {
        backgroundColor: 'red',
        padding: 8,
        borderRadius: 5,
    },
    cancelButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    noBookings: {
        textAlign: 'center',
        fontSize: 16,
        color: 'gray',
    },
    logoutButton: {
        backgroundColor: 'blue',
        padding: 10,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
    },
    logoutButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
