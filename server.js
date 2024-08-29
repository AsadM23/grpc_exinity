
import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

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

let candlestickData = [];

const server = new grpc.Server();

server.addService(chartProto.ChartService.service, {
    Subscribe: (call) => {
        const { timeframe, symbol_list } = call.request;

        console.log(`Received request for symbols: ${symbol_list}`);

        symbol_list.forEach(symbol => {
            const interval = setInterval(() => {
                const tickData = generateTickData(symbol);
                console.log(`Sending data for ${symbol}:`, tickData);
                call.write({ symbol, bar: tickData });

                candlestickData.push({ symbol, ...tickData });
                saveDataToFile();

            }, 1000);

            call.on('end', () => {
                console.log(`Stream ended for symbol: ${symbol}`);
                clearInterval(interval);
            });
        });
    },
});


function generateTickData(symbol) {
    const timestamp = Date.now();
    const open = Math.random() * 100;
    const high = open + Math.random() * 10;
    const low = open - Math.random() * 10;
    const close = Math.random() * (high - low) + low;

    return { timestamp_msec: timestamp, open, high, low, close };
}

function saveDataToFile() {
    fs.writeFileSync('candlestick_data.json', JSON.stringify(candlestickData, null, 2));
}

server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
    console.log('Server running at http://127.0.0.1:50051');
    server.start();
});



