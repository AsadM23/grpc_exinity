// import grpc from '@grpc/grpc-js';
// import protoLoader from '@grpc/proto-loader';
// import fs from 'fs';
// import path from 'path';
// import { expect } from 'chai';
// import { fileURLToPath } from 'url';

// // Get the directory name of the current module
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Load proto file
// const PROTO_PATH = path.join(__dirname, '../protos/chart.proto');
// const packageDefinition = protoLoader.loadSync(PROTO_PATH);
// const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
// const ChartService = protoDescriptor.exinity.test.ChartService;

// // Create a gRPC client
// const client = new ChartService('localhost:50051', grpc.credentials.createInsecure());

// const jsonFilePath = path.join(__dirname, 'candlesticks.json');

// const aggregateTicksToCandlesticks = (ticks) => {
//     // Aggregation logic for OHLC candlesticks
//     const candlesticks = [];
//     if (ticks.length > 0) {
//         const timestamp = ticks[0].timestamp;
//         const open = ticks[0].price;
//         const high = Math.max(...ticks.map(tick => tick.price));
//         const low = Math.min(...ticks.map(tick => tick.price));
//         const close = ticks[ticks.length - 1].price;
        
//         candlesticks.push({
//             timestamp_msec: timestamp,
//             open,
//             high,
//             low,
//             close
//         });
//     }
//     return candlesticks;
// };

// const writeToJSONFile = (data, filePath) => {
//     fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
// };

// const readFromJSONFile = (filePath) => {
//     return JSON.parse(fs.readFileSync(filePath, 'utf8'));
// };

// describe('Chart Streaming Service Tests', function() {
//     this.timeout(60000); // Increased timeout for the test

//     it('should read price tick data from the stream within the last minute', function(done) {
//         const request = {
//             timeframe: 'TIMEFRAME_MINUTE_1',
//             symbol_list: ['AAPL'],
//         };

//         const call = client.Subscribe(request);

//         let receivedBars = [];
//         const startTime = Date.now(); // Track the start time
//         const oneMinute = 60 * 1000; // 1 minute in milliseconds
//         const maxDuration = 30000; // Collect data for 30 seconds

//         // Helper function to check if the bar is within the last minute
//         function isRecentBar(barTimestamp) {
//             return barTimestamp >= startTime - oneMinute && barTimestamp <= startTime;
//         }

//         call.on('data', (response) => {
//             const { symbol, bar } = response;
//             const currentTime = Date.now();

//             // Check if the bar's timestamp is within the last minute
//             if (isRecentBar(bar.timestamp_msec)) {
//                 expect(symbol).to.be.a('string');
//                 expect(bar).to.have.all.keys('timestamp_msec', 'open', 'high', 'low', 'close');
//                 receivedBars.push(bar);
//             }
//         });

//         call.on('end', () => {
//             const recentBars = receivedBars.filter(bar => isRecentBar(bar.timestamp_msec));
//             console.log(`Received ${recentBars.length} recent bars`);
//             expect(recentBars).to.be.an('array').that.is.not.empty;
//             done();
//         });

//         call.on('error', (err) => {
//             done(err);
//         });

//         // Delay the cancellation to ensure data collection
//         setTimeout(() => {
//             // Try to use cancel instead of end
//             call.cancel();
//         }, maxDuration);
//     });

//     it('should aggregate price tick data into OHLC candlesticks', function() {
//         const ticks = [
//             { timestamp: 20240801, price: 100 },
//             { timestamp: 20240801, price: 105 },
//             { timestamp: 20240801, price: 95 },
//             { timestamp: 20240801, price: 100 },
//         ];

//         const candlesticks = aggregateTicksToCandlesticks(ticks);
        
//         expect(candlesticks).to.be.an('array');
//         expect(candlesticks).to.have.lengthOf(1);
//         expect(candlesticks[0]).to.include.all.keys('timestamp_msec', 'open', 'high', 'low', 'close');
//     });

//     it('should broadcast the current OHLC bar to the streaming server', function(done) {
//         // Implement this test
//         done();
//     });

//     it('should store and retrieve candlestick data correctly', function(done) {
//         const candlestick = {
//             symbol: 'AAPL',
//             timestamp_msec: 20240801,
//             open: 100,
//             high: 105,
//             low: 95,
//             close: 100
//         };

//         writeToJSONFile([candlestick], jsonFilePath);
        
//         const storedData = readFromJSONFile(jsonFilePath);
//         expect(storedData).to.be.an('array').that.has.lengthOf(1);
//         expect(storedData[0]).to.deep.equal(candlestick);

//         done();
//     });
// });



import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import { fileURLToPath } from 'url';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Loading PROTO file
const PROTO_PATH = path.join(__dirname, '../protos/chart.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const ChartService = protoDescriptor.exinity.test.ChartService;

// Create a ChartService gRPC client
const client = new ChartService('localhost:50051', grpc.credentials.createInsecure());

// JSON file for data storage
const jsonFilePath = path.join(__dirname, 'candlesticks.json');

const aggregateTicksToCandlesticks = (ticks) => {
    const candlesticks = [];

    // Aggregation logic for OHLC candlesticks
    if (ticks.length > 0) {
        const timestamp = ticks[0].timestamp;
        const open = ticks[0].price;
        const high = Math.max(...ticks.map(tick => tick.price));
        const low = Math.min(...ticks.map(tick => tick.price));
        const close = ticks[ticks.length - 1].price;
        
        candlesticks.push({
            timestamp_msec: timestamp,
            open,
            high,
            low,
            close
        });
    }

    return candlesticks;
};

// Writing to the JSON  
const writeToJSONFile = (data, filePath) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};


// Reading from the JSON
const readFromJSONFile = (filePath) => {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

// Mocha test suite 
describe('Chart Streaming Service Tests', function() {
    this.timeout(60000); 


    // Read price tick data from the stream previous 60secs.
    it('should read price tick data from the stream within the last minute', function(done) {
        const request = {
            timeframe: 'TIMEFRAME_MINUTE_1',
            symbol_list: ['AAPL'],
        };

        const call = client.Subscribe(request);
        let receivedBars = [];
        const startTime = Date.now(); 
        const oneMinute = 60 * 1000; //
        const maxDuration = 30000; // 

        // Filtering data to retrive last 60secs of bars ony.
        function isRecentBar(barTimestamp) {
            return barTimestamp >= startTime - oneMinute && barTimestamp <= startTime;
        }

        call.on('data', (response) => {
            const { symbol, bar } = response;

            if (isRecentBar(bar.timestamp_msec)) {
                expect(symbol).to.be.a('string');
                expect(bar).to.have.all.keys('timestamp_msec', 'open', 'high', 'low', 'close');
                receivedBars.push(bar);
            }
        });

        call.on('end', () => {
            const recentBars = receivedBars.filter(bar => isRecentBar(bar.timestamp_msec));
            console.log(`Received ${recentBars.length} recent bars`);
            expect(recentBars).to.be.an('array').that.is.not.empty;
            done();
        });

        call.on('error', (err) => {
            done(err);
        });

        // Cancellation delay to allow data collection.
        setTimeout(() => {
            call.cancel(); // Use cancel if end() is causing issues
        }, maxDuration);
    });

    
    // Aggregate price tick data into OHLC candlesticks.
    it('should aggregate price tick data into OHLC candlesticks', function() {
        const ticks = [
            { timestamp: 20240801, price: 100 },
            { timestamp: 20240801, price: 105 },
            { timestamp: 20240801, price: 95 },
            { timestamp: 20240801, price: 100 },
        ];

        const candlesticks = aggregateTicksToCandlesticks(ticks);
        
        expect(candlesticks).to.be.an('array');
        expect(candlesticks).to.have.lengthOf(1);
        expect(candlesticks[0]).to.include.all.keys('timestamp_msec', 'open', 'high', 'low', 'close');
    });

    // Broadcast the current OHLC bar to the streaming server.
    it('should broadcast the current OHLC bar to the streaming server', function(done) {
        // Implement this test
        done();
    });

    // Store and retrieve candlestick data.
    it('should store and retrieve candlestick data correctly', function(done) {
        const candlestick = {
            symbol: 'AAPL',
            timestamp_msec: 20240801,
            open: 100,
            high: 105,
            low: 95,
            close: 100
        };

        writeToJSONFile([candlestick], jsonFilePath);
        
        const storedData = readFromJSONFile(jsonFilePath);
        expect(storedData).to.be.an('array').that.has.lengthOf(1);
        expect(storedData[0]).to.deep.equal(candlestick);

        done();
    });
});
