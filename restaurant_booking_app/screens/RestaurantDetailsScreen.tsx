import React, { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Alert, Modal, FlatList } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RestaurantDetailsScreen({ route }: any) {
    const { restaurant } = route.params; 
    const restaurantId = restaurant.id; 

    const [tables, setTables] = useState<{ id: number; table_number: number; seats: number; status: string }[]>([]);
    const [selectedTable, setSelectedTable] = useState<number | null>(null);
    const [modalVisible, setModalVisible] = useState(false);

    // Функция загрузки столиков ресторана
    const fetchTables = async () => {
        try {
            const response = await axios.get<{ id: number; table_number: number; seats: number; status: string }[]>(
                `http://192.168.3.58:5000/restaurants/${restaurantId}/tables`
            );
            setTables(response.data);
        } catch (error) {
            console.error("Ошибка загрузки столиков:", error);
        }
    };
    

    useEffect(() => {
        fetchTables();
    }, []);

    const handleBooking = async () => {
        try {
            const token = await AsyncStorage.getItem('token'); 

            if (!token) {
                Alert.alert('Ошибка', 'Не удалось авторизоваться');
                return;
            }

            if (!selectedTable) {
                Alert.alert('Ошибка', 'Выберите столик перед бронированием');
                return;
            }

            await axios.post(
                'http://192.168.3.58:5000/book',
                {
                    restaurant_id: restaurantId,
                    table_id: selectedTable,
                    reservation_time: new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString(),
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            Alert.alert('Успех', 'Столик забронирован');
            setModalVisible(false); // Закрываем модальное окно
            fetchTables(); // Обновляем список столиков
        } catch (error: any) {
            console.error('Ошибка бронирования:', error.response?.data);
            Alert.alert('Ошибка', error.response?.data?.error || 'Не удалось забронировать');
        }
    };

    return (
        <View style={styles.container}>
            <Image source={{ uri: restaurant.image_url }} style={styles.image} />
            <Text style={styles.name}>{restaurant.name}</Text>
            <Text style={styles.description}>{restaurant.description}</Text>

            <TouchableOpacity style={styles.button} onPress={() => setModalVisible(true)}>
                <Text style={styles.buttonText}>Забронировать</Text>
            </TouchableOpacity>

            {/* Модальное окно выбора столика */}
            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalHeader}>Выберите столик</Text>
                        
                        <FlatList
                            data={tables}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={[styles.tableItem, selectedTable === item.id && styles.selectedTable]}
                                    onPress={() => setSelectedTable(item.id)}
                                    disabled={item.status === 'booked'} // Если забронирован, нельзя выбрать
                                >
                                    <Text style={styles.tableText}>
                                        Столик №{item.table_number} ({item.seats} мест)
                                    </Text>
                                    <Text style={item.status === 'available' ? styles.available : styles.booked}>
                                        {item.status === 'available' ? 'Свободен' : 'Занят'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                                <Text style={styles.buttonText}>Отмена</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmButton} onPress={handleBooking} disabled={!selectedTable}>
                                <Text style={styles.buttonText}>Подтвердить</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff', padding: 10, alignItems: 'center' },
    image: { width: '100%', height: 200, borderRadius: 10, marginBottom: 10 },
    name: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
    description: { fontSize: 16, color: 'gray', textAlign: 'center', marginVertical: 10 },
    button: { backgroundColor: '#28A745', padding: 15, borderRadius: 10, marginTop: 20 },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
    modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { width: '80%', backgroundColor: '#fff', borderRadius: 10, padding: 20 },
    modalHeader: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
    tableItem: { padding: 10, marginVertical: 5, backgroundColor: '#ddd', borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between' },
    selectedTable: { backgroundColor: '#28A745' },
    tableText: { fontSize: 16 },
    available: { color: 'green' },
    booked: { color: 'red' },
    modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
    cancelButton: { backgroundColor: '#ccc', padding: 10, borderRadius: 5, flex: 1, marginRight: 5 },
    confirmButton: { backgroundColor: '#28A745', padding: 10, borderRadius: 5, flex: 1, marginLeft: 5 },
});

