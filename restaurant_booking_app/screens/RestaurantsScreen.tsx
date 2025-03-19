import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet } from 'react-native';
import axios from 'axios';

const API_URL = 'http://192.168.3.58:5000/restaurants'; // Укажи свой сервер

type Restaurant = {
  id: number;
  name: string;
  description: string;
  image_url: string;
};

export default function RestaurantsScreen({ navigation }: any) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

  useEffect(() => {
    axios
    .get<Restaurant[]>(API_URL)
    .then((response) => setRestaurants(response.data))
    .catch((error) => console.error('Ошибка загрузки ресторанов:', error));
  }, []);

  const renderItem = ({ item }: { item: Restaurant }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('RestaurantDetails', { restaurant: item })}
    >
      <Image source={{ uri: item.image_url }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 10 },
  card: { flexDirection: 'row', backgroundColor: '#f9f9f9', borderRadius: 10, marginBottom: 10, padding: 10, alignItems: 'center' },
  image: { width: 80, height: 80, borderRadius: 10, marginRight: 10 },
  info: { flex: 1 },
  name: { fontSize: 18, fontWeight: 'bold' },
  description: { fontSize: 14, color: 'gray' },
});
