import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Modal
} from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import axios from 'axios';

const API_BASE = 'https://postoaqui-production.up.railway.app';

// Componente para mostrar preços de um posto
function StationPrices({ stationId }) {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPrices();
    }, [stationId]);

    const fetchPrices = async () => {
        try {
            const response = await axios.get(`${API_BASE}/api/gas-stations/${stationId}/latest-prices`);
            setPrices(response.data);
        } catch (error) {
            console.error('Erro ao buscar preços:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatFuelType = (type) => {
        const types = {
            'gasolina_comum': 'Gasolina Comum',
            'gasolina_aditivada': 'Gasolina Aditivada',
            'etanol': 'Etanol',
            'diesel': 'Diesel'
        };
        return types[type] || type;
    };

    if (loading) {
        return <Text style={styles.loadingPrices}>Carregando preços...</Text>;
    }

    return (
        <View style={styles.pricesContainer}>
            <Text style={styles.pricesTitle}>Preços Atuais:</Text>
            {prices.length === 0 ? (
                <Text style={styles.noPrices}>Nenhum preço reportado</Text>
            ) : (
                prices.map((priceData, index) => (
                    <View key={index} style={styles.priceItem}>
                        <Text style={styles.fuelTypeName}>{formatFuelType(priceData.fuel_type)}</Text>
                        <Text style={styles.priceValue}>R$ {parseFloat(priceData.price).toFixed(3)}</Text>
                    </View>
                ))
            )}
        </View>
    );
}

// Componente para o formulário de preços
function PriceForm({ stationId, visible, onClose, onPriceAdded }) {
    const [fuelType, setFuelType] = useState('gasolina_comum');
    const [price, setPrice] = useState('');
    const [loading, setLoading] = useState(false);

    const fuelTypes = [
        { value: 'gasolina_comum', label: 'Gasolina Comum' },
        { value: 'gasolina_aditivada', label: 'Gasolina Aditivada' },
        { value: 'etanol', label: 'Etanol' },
        { value: 'diesel', label: 'Diesel' }
    ];

    const handleSubmit = async () => {
        if (!price) {
            Alert.alert('Erro', 'Digite um preço válido');
            return;
        }

        setLoading(true);
        try {
            await axios.post(`${API_BASE}/api/prices`, {
                gas_station_id: stationId,
                fuel_type: fuelType,
                price: parseFloat(price)
            });

            setPrice('');
            Alert.alert('Sucesso', 'Preço reportado com sucesso!');
            onPriceAdded();
            onClose();
        } catch (error) {
            console.error('Erro ao reportar preço:', error);
            if (error.response?.data?.errors) {
                Alert.alert('Erro', error.response.data.errors[0]);
            } else {
                Alert.alert('Erro', 'Erro ao reportar preço. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Reportar Preço</Text>

                    <Text style={styles.label}>Tipo de Combustível:</Text>
                    <ScrollView style={styles.fuelTypeSelector} horizontal showsHorizontalScrollIndicator={false}>
                        {fuelTypes.map((fuel) => (
                            <TouchableOpacity
                                key={fuel.value}
                                style={[
                                    styles.fuelButton,
                                    fuelType === fuel.value && styles.fuelButtonSelected
                                ]}
                                onPress={() => setFuelType(fuel.value)}
                            >
                                <Text style={[
                                    styles.fuelButtonText,
                                    fuelType === fuel.value && styles.fuelButtonTextSelected
                                ]}>
                                    {fuel.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <Text style={styles.label}>Preço (R$):</Text>
                    <TextInput
                        style={styles.priceInput}
                        placeholder="0.000"
                        keyboardType="numeric"
                        value={price}
                        onChangeText={setPrice}
                    />

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onClose}
                        >
                            <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.submitButton]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>Reportar</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

export default function App() {
    const [location, setLocation] = useState(null);
    const [gasStations, setGasStations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedStation, setSelectedStation] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);

    useEffect(() => {
        getLocationPermission();
    }, []);

    const getLocationPermission = async () => {
        try {
            // Solicitar permissões de localização explicitamente
            let { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    'Permissão de Localização Necessária',
                    'Este app precisa de acesso à sua localização para encontrar postos próximos. Por favor, habilite nas configurações.',
                    [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                            text: 'Configurações',
                            onPress: () => {
                                // Usar localização padrão se recusar
                                const defaultLocation = {
                                    latitude: -23.5505,
                                    longitude: -46.6333,
                                };
                                setLocation(defaultLocation);
                                fetchGasStations(defaultLocation.latitude, defaultLocation.longitude);
                                setLoading(false);
                            }
                        }
                    ]
                );
                return;
            }

            // Verificar se os serviços de localização estão habilitados
            let locationServicesEnabled = await Location.hasServicesEnabledAsync();
            if (!locationServicesEnabled) {
                Alert.alert(
                    'GPS Desabilitado',
                    'Por favor, habilite o GPS nas configurações do seu dispositivo.',
                    [{ text: 'OK' }]
                );
                // Usar localização padrão
                const defaultLocation = {
                    latitude: -23.5505,
                    longitude: -46.6333,
                };
                setLocation(defaultLocation);
                fetchGasStations(defaultLocation.latitude, defaultLocation.longitude);
                setLoading(false);
                return;
            }

            // Obter localização com alta precisão
            let currentLocation = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.BestForNavigation,
                timeout: 15000,
                maximumAge: 10000,
            });

            const coords = {
                latitude: currentLocation.coords.latitude,
                longitude: currentLocation.coords.longitude,
            };

            setLocation(coords);
            fetchGasStations(coords.latitude, coords.longitude);
            setLoading(false);

        } catch (error) {
            console.error('Erro ao obter localização:', error);
            Alert.alert(
                'Erro de Localização',
                'Não foi possível obter sua localização. Usando localização padrão (São Paulo).',
                [{ text: 'OK' }]
            );

            // Usar localização padrão em caso de erro
            const defaultLocation = {
                latitude: -23.5505,
                longitude: -46.6333,
            };
            setLocation(defaultLocation);
            fetchGasStations(defaultLocation.latitude, defaultLocation.longitude);
            setLoading(false);
        }
    };

    const fetchGasStations = async (lat, lng) => {
        try {
            const response = await axios.get(
                `${API_BASE}/api/gas-stations?lat=${lat}&lng=${lng}&radius=300`
            );
            setGasStations(response.data);
        } catch (error) {
            console.error('Erro ao buscar postos:', error);
            Alert.alert('Erro', 'Erro ao carregar postos da região');
        }
    };

    const openPriceForm = (station) => {
        setSelectedStation(station);
        setModalVisible(true);
    };

    const handlePriceAdded = () => {
        // Recarregar dados se necessário
        if (location) {
            fetchGasStations(location.latitude, location.longitude);
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007bff" />
                <Text style={styles.loadingText}>Carregando mapa...</Text>
            </View>
        );
    }

    if (!location) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Erro ao obter localização</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>PostoAqui</Text>
                <Text style={styles.subtitle}>
                    Postos encontrados: {gasStations.length}
                </Text>
            </View>

            <MapView
                style={styles.map}
                initialRegion={{
                    latitude: location.latitude,
                    longitude: location.longitude,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                showsUserLocation={true}
                showsMyLocationButton={true}
            >
                {gasStations.map((station) => (
                    <Marker
                        key={station.id}
                        coordinate={{
                            latitude: parseFloat(station.latitude),
                            longitude: parseFloat(station.longitude),
                        }}
                        pinColor="red"
                    >
                        <Callout style={styles.callout}>
                            <View style={styles.calloutContainer}>
                                <Text style={styles.stationName}>{station.name}</Text>
                                <Text style={styles.stationAddress}>{station.address}</Text>
                                <Text style={styles.stationDistance}>
                                    Distância: {station.distance.toFixed(2)} km
                                </Text>

                                <StationPrices stationId={station.id} />

                                <TouchableOpacity
                                    style={styles.reportButton}
                                    onPress={() => openPriceForm(station)}
                                >
                                    <Text style={styles.reportButtonText}>📝 Reportar Preço</Text>
                                </TouchableOpacity>
                            </View>
                        </Callout>
                    </Marker>
                ))}
            </MapView>

            <PriceForm
                stationId={selectedStation?.id}
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onPriceAdded={handlePriceAdded}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#666',
    },
    header: {
        backgroundColor: '#282c34',
        padding: 20,
        paddingTop: 50,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
    },
    subtitle: {
        fontSize: 14,
        color: '#fff',
        marginTop: 5,
    },
    map: {
        flex: 1,
    },
    callout: {
        width: 250,
    },
    calloutContainer: {
        padding: 10,
        width: 250,
    },
    stationName: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    stationAddress: {
        fontSize: 12,
        color: '#666',
        marginBottom: 3,
    },
    stationDistance: {
        fontSize: 12,
        color: '#666',
        marginBottom: 10,
    },
    pricesContainer: {
        marginBottom: 10,
    },
    pricesTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#333',
    },
    loadingPrices: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
    },
    noPrices: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
    },
    priceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 2,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    fuelTypeName: {
        fontSize: 12,
        color: '#333',
        flex: 1,
    },
    priceValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#28a745',
    },
    reportButton: {
        backgroundColor: '#007bff',
        padding: 8,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 10,
    },
    reportButtonText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        margin: 20,
        padding: 20,
        borderRadius: 10,
        width: '90%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 10,
    },
    fuelTypeSelector: {
        maxHeight: 50,
    },
    fuelButton: {
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 5,
        marginRight: 10,
        minWidth: 100,
        alignItems: 'center',
    },
    fuelButtonSelected: {
        backgroundColor: '#007bff',
    },
    fuelButtonText: {
        fontSize: 12,
        color: '#333',
    },
    fuelButtonTextSelected: {
        color: '#fff',
        fontWeight: 'bold',
    },
    priceInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        fontSize: 16,
        marginBottom: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#6c757d',
    },
    cancelButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    submitButton: {
        backgroundColor: '#007bff',
    },
    submitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});