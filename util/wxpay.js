const http = require('http');
const ssl = require('ssl');
const querystring = require('querystring');

ssl.loadRootCerts();
let cookie = '', wxuin, wxsid, _syncKey, MsgIdPool = [];

// 微信心跳包
function getSyncKey() {

    let rs = http.post(`https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxinit?r=695888609`, {
        headers: {
            'accept': 'application/json, text/javascript',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
            'connection': 'keep-alive',
            'content-length': '295',
            'content-Type': 'application/json;charset=UTF-8',
            'cookie': cookie,
            'host': 'wx.qq.com',
            'origin': 'https://wx.qq.com',
            'referer': 'https://wx.qq.com/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36'
        },
        'body': `{"BaseRequest":{"Uin":${wxuin},"Sid":"${wxsid}","Skey":"","DeviceID":"e453731506754000"}}`
    });
    return JSON.parse(rs.data.toString());
}

// min and max included
function randomIntFromInterval(min,max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function Html(sync) {
    let rs = http.post(`https://wx.qq.com/cgi-bin/mmwebwx-bin/webwxsync?sid=${wxsid}&skey=`, {
        headers: {
            'accept': 'application/json, text/javascript',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
            'connection': 'keep-alive',
            'content-length': '295',
            'content-Type': 'application/json;charset=UTF-8',
            'cookie': cookie,
            'host': 'wx.qq.com',
            'origin': 'https://wx.qq.com',
            'referer': 'https://wx.qq.com/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36'
        },
        'body': `{"BaseRequest":{"Uin":${wxuin},"Sid":"${wxsid}","Skey":"","DeviceID":"e453731506754000"},"SyncKey":${sync},"rr":${randomIntFromInterval(100000000, 999999999)}}`
    });
    return JSON.parse(rs.data.toString());
}

function getData() {

    let sync;
    if (!_syncKey || _syncKey.includes('"Count":0')) {
        let syncJson = getSyncKey();
        if (syncJson.BaseResponse.Ret > 0) throw '微信：cookie失效';
        sync = JSON.stringify(syncJson.SyncKey);
    } else {
        sync = _syncKey;
    }
    let rs = Html(sync);
    if (rs.BaseResponse.Ret > 0) throw '微信：cookie失效';

    _syncKey = JSON.stringify(rs.SyncKey);
    return rs;
}

function DataContrast({time = Date.now(), minute = 3, fee, remark}) {

    let newTrade = [];
    let rs = getData();
    let AddMsgList = rs.AddMsgList;
    if (AddMsgList && Array.isArray(AddMsgList)) {

        AddMsgList.forEach(r => {
            let FileName = r.FileName;
            if (!FileName.includes('微信支付收款')) return;

            let CreateTime = r.CreateTime * 1000;
            let isFilterTime = CreateTime > time - minute * 60 * 1000 && CreateTime < time;

            let fees = FileName.split('微信支付收款')[1].split('元')[0];
            if (!isFilterTime || (fee && Number(fees) !== fee) || (remark && !r.Content.includes(`备注${remark}`))) return;

            let MsgId = r.MsgId;
            if (!MsgIdPool.includes(MsgId)) {
                newTrade.push(FileName);
                MsgIdPool.push(r.MsgId);
            }
        });
    }
    return newTrade;
}

module.exports = (ck, params = {}) => {

    cookie = ck;

    let rs = querystring.parse(cookie, '; ');
    wxuin = rs.wxuin;
    wxsid = rs.wxsid;

    return DataContrast(params);
}