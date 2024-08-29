import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROTO_PATH = path.join(__dirname, 'protos', 'chart.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});
const chartProto = grpc.loadPackageDefinition(packageDefinition).exinity.test;

const client = new chartProto.ChartService('localhost:50051', grpc.credentials.createInsecure());

const request = {
    timeframe: 'TIMEFRAME_MINUTE_1',
    symbol_list: ['ASAD', 'MASOOD']
};

const call = client.Subscribe(request);

call.on('data', (response) => {
    console.log(`Received data for ${response.symbol}:`, response.bar);
});

call.on('end', () => {
    console.log('Stream ended.');
});

call.on('error', (error) => {
    console.error(error);
});
