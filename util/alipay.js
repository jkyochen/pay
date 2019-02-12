require('./dateformat.js');

const http = require('http');
const ssl = require('ssl');
const iconv = require("iconv-lite");
const querystring = require('querystring');

ssl.loadRootCerts();
let cookie, ctoken, uid, yesterday, today;

function getRefresh() {

    let rs = http.post(`https://enterpriseportal.alipay.com/portal/navload.json?t=${Date.now()}`, {
        headers: {
            'cookie': cookie,
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'accept': 'application/json, text/javascript',
            'referer': 'https://mbillexprod.alipay.com/enterprise/tradeListQuery.htm',
            'origin': 'https://mbillexprod.alipay.com',
            'connection': 'keep-alive',
        },
        'body': 'action=loadEntInfo'
    });
    return rs.json();
}

// 对账中心 > 业务查询 > 卖出交易
// 外部商户
function HtmlOne() {

    return http.post('https://mbillexprod.alipay.com/enterprise/tradeListQuery.json', {
        headers: {
            'cookie': cookie,
            'Origin': 'https://mbillexprod.alipay.com',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'accept': 'application/json, text/javascript',
            'referer': 'https://mbillexprod.alipay.com/enterprise/fundAccountDetail.htm',
            'x-requested-with': 'XMLHttpRequest',
            'connection': 'keep-alive',
        },
        body: `queryEntrance=1&billUserId=${uid}&status=SUCCESS&entityFilterType=0&activeTargetSearchItem=tradeNo&tradeFrom=ALL&startTime=${yesterday}+00%3A00%3A00&endTime=${today}+23%3A59%3A59&pageSize=20&pageNum=1&total=1&sortTarget=gmtCreate&order=descend&sortType=0&_input_charset=gbk&ctoken=${ctoken}`
    });
}

// 对账中心 > 资金查询 > 账务明细
// 转账收款码
function HtmlTwo() {

    return http.post('https://mbillexprod.alipay.com/enterprise/fundAccountDetail.json', {
        headers: {
            'cookie': cookie,
            'Origin': 'https://mbillexprod.alipay.com',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36',
            'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
            'accept': 'application/json, text/javascript',
            'referer': 'https://mbillexprod.alipay.com/enterprise/fundAccountDetail.htm',
            'x-requested-with': 'XMLHttpRequest',
            'connection': 'keep-alive',
        },
        body: `queryEntrance=1&billUserId=${uid}&showType=1&type=&precisionQueryKey=tradeNo&startDateInput=${yesterday}+00%3A00%3A00&endDateInput=${today}+23%3A59%3A59&pageSize=20&pageNum=1&total=1&sortTarget=tradeTime&order=descend&sortType=0&_input_charset=gbk&ctoken=${ctoken}`
    });
}

function convert(rs) {
    // GBK
    // GB18030
    // UTF-8
    let contentType = rs.headers['Content-Type'];
    let charset = contentType.split('charset=')[1];

    try {
        return JSON.parse(iconv.decode(rs.data, "GBK"));
    } catch(e) {
        console.log(e);
    }
    return rs.json();
}

function getData(type) {

    function _get(t) {
        let rs = t ? HtmlOne() : HtmlTwo();
        return convert(rs);
    }

    let rs = getRefresh();
    if (!rs.navResult || !rs.navResult.result) throw 'cookie失效';
    rs = _get(type);

    if (rs.status === 'failed') {
        rs = _get(!type);
        if (rs.status === 'failed') throw rs.msg || '频繁访问';
    }
    return rs;
}

let tradePool = [];
function DataContrast({type, time = Date.now(), minute = 3, fee, remark}) {

    let rs = getData(type);
    let newTrade = [];
    if (rs.result && rs.result.detail && Array.isArray(rs.result.detail)) {
        rs.result.detail.forEach(r => {

            if (!((r.tradeFrom === '外部商户' && r.direction === '卖出') || (r.signProduct === '转账收款码' && r.accountType === '交易'))) return;

            let receiveFee;
            let receiveTime;
            if (r.tradeFrom === '外部商户' && r.direction === '卖出') {

                let gmtCreate = new Date(r.gmtCreate).getTime();
                let isFilterTime = gmtCreate > time - minute * 60 * 1000 && gmtCreate < time;
                if (!isFilterTime || (fee && r.totalAmount !== fee)) return;

                receiveFee = r.totalAmount;
                receiveTime = new Date(gmtCreate);

            } else {

                let tradeTime = new Date(r.tradeTime).getTime();
                let isFilterTime = tradeTime > time - minute * 60 * 1000 && tradeTime < time;
                if (!isFilterTime || (fee && r.totalAmount !== fee)) return;

                receiveFee = r.tradeAmount;
                receiveTime = new Date(tradeTime);
            }

            if (!((remark && r.goodsTitle.includes(remark)) || r.goodsTitle === '商品')) return;

            let tradeNo = r.tradeNo;
            if (!tradePool.includes(tradeNo)) {
                newTrade.push({
                    name: r.otherAccountFullname || r.consumerName,
                    time: receiveTime.Format('yyyy-MM-dd hh:mm'),
                    fee: receiveFee
                });
                tradePool.push(tradeNo);
            }
        });
    }
    return newTrade;
}

module.exports = (ck, params) => {

    cookie = ck;

    let rs = querystring.parse(cookie, '; ');
    ctoken = rs.ctoken;

    let ali_apache_tracktmp = querystring.parse(rs.ali_apache_tracktmp, '"');
    uid = ali_apache_tracktmp.uid;

    yesterday = new Date().DateAdd('d', -1).Format();
    today = new Date().Format();

    return DataContrast(params);
}