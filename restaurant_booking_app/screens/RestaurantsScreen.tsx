import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList } from 'react-native';
import axios from 'axios';
import { StackNavigationProp } from '@react-navigation/stack';

type Restaurant = {
    id: number;
    name: string;
};

type RestaurantsScreenProps = {
    navigation: StackNavigationProp<any, any>;
};

export default function RestaurantsScreen({ navigation }: RestaurantsScreenProps) {
    const [restaurants, setRestaurants] = useState<Restaurant[]>([]);

    useEffect(() => {
        axios
            .get<Restaurant[]>('http://localhost:5000/restaurants')
            .then((response) => setRestaurants(response.data))
            .catch((error) => console.error(error));
    }, []);

    return (
        <View>
            <Text>Список ресторанов</Text>
            <FlatList
                data={restaurants}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <View>
                        <Text>{item.name}</Text>
                        <Button title="Забронировать" onPress={() => navigation.navigate('Booking', { restaurantId: item.id })} />
                    </View>
                )}
            />
        </View>
    );
}
