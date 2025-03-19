import React from 'react';
import { View, Text, Button, Alert } from 'react-native';
import axios from 'axios';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

type BookingScreenProps = {
    route: RouteProp<{ Booking: { restaurantId: number } }, 'Booking'>;
    navigation: StackNavigationProp<any, any>;
};

export default function BookingScreen({ route, navigation }: BookingScreenProps) {
    const { restaurantId } = route.params ?? { restaurantId: 0 }; // ✅ Добавлена проверка на undefined

    const handleBooking = async () => {
        try {
            await axios.post('http://localhost:5000/book', {
                restaurant_id: restaurantId,
                table_id: 1,
                reservation_time: new Date().toISOString(),
            });
            Alert.alert('Успех', 'Столик забронирован', [
                { text: 'OK', onPress: () => navigation.navigate('Main') }
            ]);
        } catch (error: any) {
            Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось забронировать');
        }
    };

    return (
        <View>
            <Text>Бронирование ресторана</Text>
            <Button title="Подтвердить бронирование" onPress={handleBooking} />
        </View>
    );
}
