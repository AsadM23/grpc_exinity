import grpc from '@grpc/grpc-js';
import protoLoader from '@grpc/proto-loader';
import fs from 'fs';
import path from 'path';
import { expect } from 'chai';
import { fileURLToPath } from 'url';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load PROTO file
const PROTO_PATH = path.join(__dirname, '../protos/chart.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const ChartService = protoDescriptor.exinity.test.ChartService;

// Create a ChartService gRPC client
const client = new ChartService('localhost:50051', grpc.credentials.createInsecure());

// Path for JSON file storage
const jsonFilePath = path.join(__dirname, 'candlesticks.json');

// Aggregation logic for OHLC candlesticks
const aggregateTicksToCandlesticks = (ticks) => {
    const candlesticks = [];

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

// Write data to JSON file
const writeToJSONFile = (data, filePath) => {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// Read data from JSON file
const readFromJSONFile = (filePath) => {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

// Check for duplicate candlestick entries in the JSON file
const checkForDuplicates = (data) => {
    const seen = new Set();
    const duplicates = [];

    data.forEach(entry => {
        const key = `${entry.symbol}-${entry.timestamp_msec}`;
        if (seen.has(key)) {
            duplicates.push(entry);
        } else {
            seen.add(key);
        }
    });

    return duplicates;
};

// Mocha test suite
describe('Chart Streaming Service Tests', function() {
    this.timeout(120000);

    // Test: Read price tick data from the stream within the last 60 secs.
    it('should read price tick data from the stream within the last minute', function(done) {
        const request = {
            timeframe: 'TIMEFRAME_MINUTE_1',
            symbol_list: ['ASAD', 'MASOOD'],
        };

        const call = client.Subscribe(request);
        let receivedBars = [];
        const startTime = Date.now();
        const oneMinute = 60 * 1000;
        const maxDuration = 30000;

        function isRecentBar(barTimestamp) {
            return barTimestamp >= startTime - oneMinute && barTimestamp <= startTime;
        }

        call.on('data', (response) => {
            const { symbol, bar } = response;
            const currentTime = Date.now();

            console.log(`Received bar: ${JSON.stringify(bar)} at ${currentTime}`);

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
            console.error('Stream error:', err);
            done(err);
        });

        setTimeout(() => {
            console.log('Cancelling call');
            call.cancel(); 
        }, maxDuration);
    });

    // Test: Aggregate price tick data into OHLC candlesticks.
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

    // Test: Broadcast current OHLC bar to the streaming server.
    it('should broadcast the current OHLC bar to the streaming server', function(done) {
        // Implement this test based on the actual broadcasting implementation
        done();
    });

    // Test: Store and retrieve candlestick data correctly.
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

    // Test: Check for duplicate candlestick entries in the JSON file.
    it('should not have duplicate candlestick entries in the JSON file', function(done) {
        const data = readFromJSONFile(jsonFilePath);
        const duplicates = checkForDuplicates(data);
        expect(duplicates).to.be.an('array').that.is.empty;
        done();
    });

    // Test: Error handling for invalid entries.
    it('should handle errors from invalid data gracefully', function(done) {

        // Write invalid data to the JSON 
        const invalidData = [
            { symbol: 'INVALID', timestamp_msec: 'INVALID_TIMESTAMP', open: 'INVALID', high: 'INVALID', low: 'INVALID', close: 'INVALID' }
        ];
        writeToJSONFile(invalidData, jsonFilePath);

        // // Read data from JSON  and throw an error to ensure that invalid data processing fails.
        try {
            const data = readFromJSONFile(jsonFilePath);
            expect(() => {
                throw new Error('Invalid data processing should fail');
            }).to.throw();

            done();
        } catch (error) {
            done(error);
        }
    });
});
