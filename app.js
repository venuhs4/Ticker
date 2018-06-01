'use strict';

var JsonDB = require("node-json-db");
var request = require('sync-request');

//var db = new JsonDB("TickerDB", true, false);
const urls = ['https://bitbns.com/order/getTickerWithVolume/', 'https://bx.in.th/api/'];
var count = 1;

const TeleBot = require('telebot');

const bot = new TeleBot('540008954:AAEWBT_xFCQ5aMncqthJ5EcnJE6s11E5IC8');
var chatId = 201226361;
var lastSent = undefined;
var lastSentTime = new Date();
var roundTripNotifyDelay = 30000;
var notifyThreshould = { xrpB2I: 2.3, xrpI2B: 2.15, powB2I: 2.3, powI2B: 2.15, bchB2I: 2.3, bchI2B: 2.15 };
var changeStep = 0.01;
var roundTripProfit = 1010;
var rate = {};
var priceChangeWatchList = [];
var oldData = [{}, {}], data = [{}, {}];

var getResponse = function (url) {
    var res = request('GET', url, {
        headers: {
            'user-agent': 'example-user-agent',
        },
        timeout: 5000
    });
    return JSON.parse(res.getBody('utf-8'));
}

var getParallel = async function () {
    try {
        data = [];
        data[0] = getResponse(urls[0]);
        data[1] = getResponse(urls[1]);
    } catch (err) {
        console.error(err);
    }
    var bb = {
        XRP: [data[0].XRP.lowest_sell_bid, data[0].XRP.highest_buy_bid, data[0].XRP.volume.volume],
        BCH: [data[0].BCH.lowest_sell_bid, data[0].BCH.highest_buy_bid, data[0].BCH.volume.volume],
        POW: [data[0].POWR.lowest_sell_bid, data[0].POWR.highest_buy_bid, data[0].POWR.volume.volume]
    };
    var bx = {
        XRP: [data[1][25].orderbook.asks.highbid, data[1][25].orderbook.bids.highbid, data[1][25].volume_24hours],
        BCH: [data[1][27].orderbook.asks.highbid, data[1][27].orderbook.bids.highbid, data[1][27].volume_24hours],
        POW: [data[1][31].orderbook.asks.highbid, data[1][31].orderbook.bids.highbid, data[1][31].volume_24hours]
    }

    var bth = 5000;
    var inr = 10000;
    var xrpB2I = parseFloat(((bth * 0.9975 / bx["XRP"][0] - 0.01) * bb["XRP"][1] * 0.9975 / bth).toFixed(4));
    var xrpI2B = parseFloat((1.0 / ((inr * 0.9975 / bb["XRP"][0] - 0.1) * bx["XRP"][1] * 0.9975 / inr)).toFixed(4));
    var powB2I = parseFloat(((bth * 0.9975 / bx["POW"][0] - 0.01) * bb["POW"][1] * 0.9975 / bth).toFixed(4));
    var powI2B = parseFloat((1.0 / ((inr * 0.9975 / bb["POW"][0] - 8) * bx["POW"][1] * 0.9975 / inr)).toFixed(4));
    var bchB2I = parseFloat(((bth * 0.9975 / bx["BCH"][0] - 0.0001) * bb["BCH"][1] * 0.9975 / bth).toFixed(4));
    var bchI2B = parseFloat((1.0 / ((inr * 0.9975 / bb["BCH"][0] - 0.001) * bx["BCH"][1] * 0.9975 / inr)).toFixed(4));

    rate = { xrpB2I: xrpB2I, xrpI2B: xrpI2B, powB2I: powB2I, powI2B: powI2B, bchB2I: bchB2I, bchI2B: bchI2B };

    var content = "XRP: " + xrpB2I + " - " + xrpI2B + ' POW: ' + powB2I + " - " + powI2B + ' BCH: ' + bchB2I + " - " + bchI2B;
    //console.log((new Date()).toLocaleTimeString() + " " + count++ + "   XRP: " + xrpB2I + " - " + xrpI2B + "      POW: " + powB2I + " - " + powI2B);

    if (lastSent) {
        //bellow are the notifications for round trip profit
        if (xrpB2I > powI2B && ((xrpB2I / powI2B) * 1000) > roundTripProfit && (new Date() - lastSentTime) > roundTripNotifyDelay) {
            bot.sendMessage(chatId, "Round Trip Profit : [" + ((xrpB2I / powI2B) * 1000).toFixed(0) + "/1000] : xrpB2I (" + xrpB2I + ") > powI2B (" + powI2B + ")");
            lastSentTime = new Date();
        }
        if (xrpB2I > bchI2B && ((xrpB2I / bchI2B) * 1000) > roundTripProfit && (new Date() - lastSentTime) > roundTripNotifyDelay) {
            bot.sendMessage(chatId, "Round Trip Profit : [" + ((xrpB2I / bchI2B) * 1000).toFixed(0) + "/1000] : xrpB2I (" + xrpB2I + ") > bchI2B (" + bchI2B + ")");
            lastSentTime = new Date();
        }

        if (powB2I > xrpI2B && ((powB2I / xrpI2B) * 1000) > roundTripProfit && (new Date() - lastSentTime) > roundTripNotifyDelay) {
            bot.sendMessage(chatId, "Round Trip Profit : [" + ((powB2I / xrpI2B) * 1000).toFixed(0) + "/1000] : powB2I (" + powB2I + ") > xrpI2B (" + xrpI2B + ")");
            lastSentTime = new Date();
        }
        if (powB2I > bchI2B && ((powB2I / bchI2B) * 1000) > roundTripProfit && (new Date() - lastSentTime) > roundTripNotifyDelay) {
            bot.sendMessage(chatId, "Round Trip Profit : [" + ((powB2I / bchI2B) * 1000).toFixed(0) + "/1000] : powB2I (" + powB2I + ") > bchI2B (" + bchI2B + ")");
            lastSentTime = new Date();
        }

        if (bchB2I > xrpI2B && ((bchB2I / xrpI2B) * 1000) > roundTripProfit && (new Date() - lastSentTime) > roundTripNotifyDelay) {
            bot.sendMessage(chatId, "Round Trip Profit : [" + ((bchB2I / xrpI2B) * 1000).toFixed(0) + "/1000] : bchB2I (" + bchB2I + ") > xrpI2B (" + xrpI2B + ")");
            lastSentTime = new Date();
        }
        if (bchB2I > powI2B && ((bchB2I / powI2B) * 1000) > roundTripProfit && (new Date() - lastSentTime) > roundTripNotifyDelay) {
            bot.sendMessage(chatId, "Round Trip Profit : [" + ((bchB2I / powI2B) * 1000).toFixed(0) + "/1000] : bchB2I (" + bchB2I + ") > powI2B (" + powI2B + ")");
            lastSentTime = new Date();
        }

        //bellow are the notifications for normal price change 
        if (xrpB2I > notifyThreshould.xrpB2I && Math.abs(lastSent.xrpB2I - xrpB2I) > changeStep) {
            if (chatId != 0) {
                bot.sendMessage(chatId, "XRP B2I good price(" + xrpB2I + ") " + content);
            }
            lastSent = { xrpB2I: xrpB2I, xrpI2B: xrpI2B, powB2I: powB2I, powI2B: powI2B, bchB2I: bchB2I, bchI2B: bchI2B };
        }
        if (xrpI2B < notifyThreshould.xrpI2B && Math.abs(lastSent.xrpI2B - xrpI2B) > changeStep) {
            if (chatId != 0) {
                bot.sendMessage(chatId, "XRP I2B good price(" + xrpI2B + ")" + content);
            }
            lastSent = { xrpB2I: xrpB2I, xrpI2B: xrpI2B, powB2I: powB2I, powI2B: powI2B, bchB2I: bchB2I, bchI2B: bchI2B };
        }
        if (powB2I > notifyThreshould.powB2I && Math.abs(lastSent.powB2I - powB2I) > changeStep) {
            if (chatId != 0) {
                bot.sendMessage(chatId, "POW B2I good price(" + powB2I + ")" + content);
            }
            lastSent = { xrpB2I: xrpB2I, xrpI2B: xrpI2B, powB2I: powB2I, powI2B: powI2B, bchB2I: bchB2I, bchI2B: bchI2B };
        }
        if (powI2B < notifyThreshould.powI2B && Math.abs(lastSent.powI2B - powI2B) > changeStep) {
            if (chatId != 0) {
                bot.sendMessage(chatId, "POW I2B good price(" + powI2B + ")" + content);
            }
            lastSent = { xrpB2I: xrpB2I, xrpI2B: xrpI2B, powB2I: powB2I, powI2B: powI2B, bchB2I: bchB2I, bchI2B: bchI2B };
        }

        if (bchB2I > notifyThreshould.bchB2I && Math.abs(lastSent.bchB2I - bchB2I) > changeStep) {
            if (chatId != 0) {
                bot.sendMessage(chatId, "BCH B2I good price(" + bchB2I + ")" + content);
            }
            lastSent = { xrpB2I: xrpB2I, xrpI2B: xrpI2B, powB2I: powB2I, powI2B: powI2B, bchB2I: bchB2I, bchI2B: bchI2B };
        }
        if (bchI2B < notifyThreshould.bchI2B && Math.abs(lastSent.bchI2B - bchI2B) > changeStep) {
            if (chatId != 0) {
                bot.sendMessage(chatId, "BCH I2B good price(" + bchI2B + ")" + content);
            }
            lastSent = { xrpB2I: xrpB2I, xrpI2B: xrpI2B, powB2I: powB2I, powI2B: powI2B, bchB2I: bchB2I, bchI2B: bchI2B };
        }

    }
    else {
        lastSent = { xrpB2I: xrpB2I, xrpI2B: xrpI2B, powB2I: powB2I, powI2B: powI2B, bchB2I: bchB2I, bchI2B: bchI2B };
    }

    //price change notifications
    for (var i = 0; i < priceChangeWatchList.length; i++) {
        try {
            var item = priceChangeWatchList[i];
            let tradeType = item[item.length - 1];
            let coin = item.slice(0, item.length - 1);
            if (tradeType == "B") {
                if (data[0][coin].highest_buy_bid > oldData[0][coin].highest_buy_bid) {
                    bot.sendMessage(chatId, "Price change " + coin + " BUY (Need Order Update) :" + oldData[0][coin].highest_buy_bid + " => " + data[0][coin].highest_buy_bid);
                }
                else if (data[0][coin].highest_buy_bid < oldData[0][coin].highest_buy_bid) {
                    bot.sendMessage(chatId, "Price change " + coin + " BUY (Order Complete):" + oldData[0][coin].highest_buy_bid + " => " + data[0][coin].highest_buy_bid);
                }
            }
            else {
                if (data[0][coin].lowest_sell_bid < oldData[0][coin].lowest_sell_bid) {
                    bot.sendMessage(chatId, "Price change " + coin + " SELL (Need Order Update) :" + oldData[0][coin].lowest_sell_bid + " => " + data[0][coin].lowest_sell_bid);
                }
                else if (data[0][coin].lowest_sell_bid > oldData[0][coin].lowest_sell_bid) {
                    bot.sendMessage(chatId, "Price change " + coin + " SELL (Order Complete):" + oldData[0][coin].lowest_sell_bid + " => " + data[0][coin].lowest_sell_bid);
                }
            }
        }
        catch (e) { console.log(e); }
    }
    oldData = data;
}

bot.mod('text', (data) => {
    console.log(data.message.text);
    return data;
});

bot.on(['/getdbfile'], (msg) => {
    msg.reply.text('ok gotcha! sending it now...');
    bot.sendDocument(msg.from.id, 'TickerDB.json');
});

bot.on(['/start', '/hello'], (msg) => {
    chatId = msg.from.id;
    msg.reply.text('Welcome! You are connected now... (' + chatId + ')');
});

bot.on(['/rates'], (msg) => {
    msg.reply.text(JSON.stringify(rate));
});

bot.on(['/threshoulds'], (msg) => {
    msg.reply.text(JSON.stringify(notifyThreshould));
});

bot.on('text', (msg) => {
    if (msg.text.startsWith('/changestep')) {
        changeStep = parseFloat(msg.text.split(' ')[1]) || changeStep;
        var message = 'Changed Step changed to ' + changeStep;
        msg.reply.text(message);
    }
    if (msg.text.startsWith('/roundtripdelay')) {
        roundTripNotifyDelay = parseFloat(msg.text.split(' ')[1]) || roundTripNotifyDelay;
        var message = 'Changed roundTripNotifyDelay changed to ' + roundTripNotifyDelay;
        msg.reply.text(message);
    }

    if (msg.text.startsWith('/roundtripprofit')) {
        roundTripProfit = parseFloat(msg.text.split(' ')[1]) || roundTripProfit;
        var message = 'Changed roundTripProfit changed to ' + roundTripProfit;
        msg.reply.text(message);
    }

    if (msg.text.startsWith('/changexrpb2i')) {
        notifyThreshould.xrpB2I = parseFloat(msg.text.split(' ')[1]) || notifyThreshould.xrpB2I;
        var message = 'Threshould changed! ' + JSON.stringify(notifyThreshould);
        msg.reply.text(message);
    }
    if (msg.text.startsWith('/changexrpi2b')) {
        notifyThreshould.xrpI2B = parseFloat(msg.text.split(' ')[1]) || notifyThreshould.xrpI2B;
        var message = 'Threshould changed! ' + JSON.stringify(notifyThreshould);
        msg.reply.text(message);
    }
    if (msg.text.startsWith('/changepowb2i')) {
        notifyThreshould.powB2I = parseFloat(msg.text.split(' ')[1]) || notifyThreshould.powB2I;
        var message = 'Threshould changed! ' + JSON.stringify(notifyThreshould);
        msg.reply.text(message);
    }
    if (msg.text.startsWith('/changepowi2b')) {
        notifyThreshould.powI2B = parseFloat(msg.text.split(' ')[1]) || notifyThreshould.powI2B;
        var message = 'Threshould changed! ' + JSON.stringify(notifyThreshould);
        msg.reply.text(message);
    }

    if (msg.text.startsWith('/changebchb2i')) {
        notifyThreshould.bchB2I = parseFloat(msg.text.split(' ')[1]) || notifyThreshould.bchB2I;
        var message = 'Threshould changed! ' + JSON.stringify(notifyThreshould);
        msg.reply.text(message);
    }
    if (msg.text.startsWith('/changebchi2b')) {
        notifyThreshould.bchI2B = parseFloat(msg.text.split(' ')[1]) || notifyThreshould.bchI2B;
        var message = 'Threshould changed! ' + JSON.stringify(notifyThreshould);
        msg.reply.text(message);
    }

    if (msg.text.startsWith('/b2i')) {
        notifyThreshould.xrpB2I = parseFloat(msg.text.split(' ')[1]) || notifyThreshould.xrpB2I;
        notifyThreshould.powB2I = parseFloat(msg.text.split(' ')[1]) || notifyThreshould.powB2I;
        notifyThreshould.bchB2I = parseFloat(msg.text.split(' ')[1]) || notifyThreshould.bchB2I;
        var message = 'Threshould changed! ' + JSON.stringify(notifyThreshould);
        msg.reply.text(message);
    }
    if (msg.text.startsWith('/i2b')) {
        notifyThreshould.xrpI2B = parseFloat(msg.text.split(' ')[1]) || notifyThreshould.xrpI2B;
        notifyThreshould.powI2B = parseFloat(msg.text.split(' ')[1]) || notifyThreshould.powI2B;
        notifyThreshould.bchI2B = parseFloat(msg.text.split(' ')[1]) || notifyThreshould.bchI2B;
        var message = 'Threshould changed! ' + JSON.stringify(notifyThreshould);
        msg.reply.text(message);
    }

    if (msg.text.startsWith('/pcadd')) {
        var item = msg.text.split(' ').length > 1 ? msg.text.split(' ')[1] : '';
        if (item != '') {
            if (!priceChangeWatchList.find(function (e) { return e == item; }))
                priceChangeWatchList.push(item.toUpperCase());
        }
        msg.reply.text(JSON.stringify(priceChangeWatchList));
    }

    if (msg.text.startsWith('/pcremove')) {
        var item = msg.text.split(' ').length > 1 ? msg.text.split(' ')[1] : '';
        if (item != '') {
            priceChangeWatchList = priceChangeWatchList.filter(function (e) { return e != item.toUpperCase(); })
        }
        msg.reply.text(JSON.stringify(priceChangeWatchList));
    }

    if (msg.text.startsWith('/pcremoveall')) {
        priceChangeWatchList = [];
        msg.reply.text(JSON.stringify(priceChangeWatchList));
    }

    if (!msg.text.startsWith("/")) {
        msg.reply.text(new Date());
    }
});

bot.start();

//console.log('Bot is running');

setInterval(function () {
    getParallel();
}, 10000);
