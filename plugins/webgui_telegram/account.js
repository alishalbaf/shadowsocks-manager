const tg = appRequire('plugins/webgui_telegram/index');
const telegram = appRequire('plugins/webgui_telegram/index').telegram;
const isUser = appRequire('plugins/webgui_telegram/index').isUser;
const account = appRequire('plugins/account/index');
const server = appRequire('plugins/flowSaver/server');
const config = appRequire('services/config').all();
const { Buffer } = require('buffer');
const crypto = require('crypto');
const moment = require('moment');
const qr = require('qr-image');
const flow = appRequire('plugins/flowSaver/flow');
const knex = appRequire('init/knex').knex;
const orderPlugin = appRequire('plugins/webgui_order');
const SHA224 = require("sha224");
const base64Encode= (st) =>{return Buffer.from(st).toString('base64');};
const createAccQrCode = (server, account) => {
  if(!server) { return ''; }
  if(server.type === 'WireGuard') {
    const a = account.port % 254;
    const b = (account.port - a) / 254;
    return [
      '[Interface]',
      `Address = ${ server.net.split('.')[0] }.${ server.net.split('.')[1] }.${ b }.${ a + 1 }/32`,
      `PrivateKey = ${ account.privateKey }`,
      'DNS = 8.8.8.8',
      '[Peer]',
      `PublicKey = ${ server.key }`,
      `Endpoint = ${ server.host }:${ server.wgPort }`,
      `AllowedIPs = 0.0.0.0/0`,
    ].join('\n');
  } else if(server.type === 'Shadowsocks') {
    return 'ss://' + base64Encode(server.method + ':' + account.password + '@' + server.host + ':' + (account.port + server.shift)+server.comment);
  } else if(server.type === 'Trojan') {
    console.log(server);
    if ( server.comment.length >0)
    { //vmess
    var sh24=SHA224((account.port+':'+account.password))
    var st = sh24.toString('hex');
      st=st.substr(0, 8)+'-'+st.substr(8, 4)+'-'+st.substr(12, 4)+'-'+st.substr(16, 4)+'-'+st.substr(20, 12);
      return 'vmess://'+base64Encode(`{"add":"${server.host}","id":"${st}","port":"${server.tjPort}","ps":"${encodeURIComponent(server.name)}",${server.comment}}`)
      //'vmess://'+base64Encode('auto:'+st+'@'+server.host+':'+server.tjPort+server.comment)
      ;
    }
    return 'trojan://' + encodeURIComponent(account.port + ':' + account.password) + '@' + server.host + ':' + server.tjPort + '#' + encodeURIComponent(server.name);
  }
};

const prettyFlow = number => {
  if(number >= 0 && number < 1000) {
    return number + 'B';
  } else if(number >= 1000 && number < 1000 * 1000) {
    return (number / 1000).toFixed(1) + 'KB';
  } else if(number >= 1000 * 1000 && number < 1000 * 1000 * 1000) {
    return (number / (1000 * 1000)).toFixed(2) + 'MB';
  } else if(number >= 1000 * 1000 * 1000 && number < 1000 * 1000 * 1000 * 1000) {
    return (number / (1000 * 1000 * 1000)).toFixed(3) + 'GB';
  } else if(number >= 1000 * 1000 * 1000 * 1000 && number < 1000 * 1000 * 1000 * 1000 * 1000) {
    return (number / (1000 * 1000 * 1000 * 1000)).toFixed(3) + 'TB';
  } else {
    return number + '';
  }
};

const sleep = time => {
  return new Promise(resolve => {
    setTimeout(() => { resolve(); }, time);
  });
};

const isLogin = message => {
  if(!message.message || !message.message.text) { return false; }
  if(!message.message || !message.message.chat || !message.message.chat.type === 'private') { return false; }
  if(message.message.text.trim() !== 'login') { return false; }
  return true;
};

const isGetAccount = message => {
  /*
  if(!message.callback_query || !message.callback_query.data) { return false; }
  console.log(message.callback_query.data);
  if(!message.callback_query.data.toString()=='account') {
    return false;
  }
  return true;
  */
  
  console.log(message);
  if(!message.message || !message.message.text) { return false; }
  if(!message.message || !message.message.chat || !message.message.chat.type === 'private') { return false; }
  
  
  if(message.message.text.startsWith('نمایش')) { return true; }
  if(message.message.text.trim()!=='/account') { return false; }
  return true;
};

const isCallbackAccount = message => {
  if(!message.callback_query || !message.callback_query.data) { return false; }
  if(!message.callback_query.data.match(/^accountId\[\d{1,}\]$/)) {
    return false;
  }
  return true;
};

const isCallbackServer = message => {
  if(!message.callback_query || !message.callback_query.data) { return false; }
  if(!message.callback_query.data.match(/^accountId\[\d{1,}\]serverId\[\d{1,}\]$/)) {
    return false;
  }
  return true;
};

const isCallbackPay = message => {
  if(!message.callback_query || !message.callback_query.data) { return false; }
  if(!message.callback_query.data.match(/^paypal:accountId\[\d{1,}\]$/)) {
    return false;
  }
  return true;
};
const isCallbackPayQrcode = message => {
  if(!message.callback_query || !message.callback_query.data) { return false; }
  if(!message.callback_query.data.match(/^paypal:qrcode:accountId\[\d{1,}\]type\[[0-9]{1,}\]$/)) {
    return false;
  }
  return true;
};

telegram.on('message', async message => {
  if(isGetAccount(message)) {
    const telegramId = message.message.chat.id.toString();
    const userId = await isUser(telegramId);
    const myAccount = await account.getAccount({ userId });
    if(!myAccount.length) {
      
      if(config.plugins.paypal && config.plugins.paypal.use) {
        tg.sendKeyboard('😔هیچ اکانتی ندارید\nیک حساب جدید بخرید', telegramId, {
          inline_keyboard: [[{
            text: 'برای خرید اینجا را کلیک کنید🛒',
            callback_data: `paypal:accountId[0]`,
          }]],
        });
      }
      else{
        tg.sendMessage('کاربر فعلی هیچ حسابی اختصاص داده نشده است', telegramId);
      }
      return;
    }
    const keyboard = myAccount.map(m => {
      return {
        text: m.port.toString(),
        callback_data: `accountId[${ m.id }]`,
      };
    });
    tg.sendKeyboard('لطفاً یک حساب کاربری انتخاب کنید', telegramId, {
      inline_keyboard: [
        keyboard
      ],
    });
    const groupInfo = await knex('group').select([
      'group.multiAccount as multiAccount'
    ])
    .leftJoin('user', 'user.group', 'group.id')
    .leftJoin('account_plugin', 'account_plugin.userId', 'user.id')
    .where({ 'user.id': userId }).then(s => s[0]);
    if(groupInfo && groupInfo.multiAccount) {
      if(config.plugins.paypal && config.plugins.paypal.use) {
        tg.sendKeyboard('یک حساب جدید بخرید', telegramId, {
          inline_keyboard: [[{
            text: 'برای خرید اینجا را کلیک کنید🛒',
            callback_data: `paypal:accountId[0]`,
          }]],
        });
      }
    }
  } else if(isCallbackAccount(message)) {
    const telegramId = message.callback_query.from.id.toString();
    const accountId = message.callback_query.data.match(/^accountId\[(\d{1,})\]$/)[1];
    const userId = await isUser(telegramId);
    const myAccount = (await account.getAccount({ userId, id: +accountId }))[0];
    if(!myAccount) { return; }
    let servers = await server.list();
    const validServers = JSON.parse(myAccount.server);
    servers = servers.filter(f => {
      if(!validServers) {
        return true;
      } else {
        return validServers.indexOf(f.id) >= 0;
      }
    });
    let row = 4;
    if(servers.length <= 4) {
      row = 2;
    } else if (servers.length <= 9) {
      row = 3;
    }
    const serverArray = [];
    servers.forEach((server, index) => {
      if(index % row === 0) {
        serverArray.push([]);
      }
      serverArray[serverArray.length -1].push({
        text: server.name,
        callback_data: `accountId[${ myAccount.id }]serverId[${ server.id }]`,
      });
    });
    if(serverArray.length > 1 && serverArray[serverArray.length - 1].length < row) {
      '----'.substr(0, row - serverArray[serverArray.length - 1].length).split('').forEach(f => {
        serverArray[serverArray.length -1].push({
          text: f,
          callback_data: ' ',
        });
      });
    }
    tg.sendKeyboard('لطفا سرور را انتخاب کنید', telegramId, {
      inline_keyboard: serverArray,
    });
    if(myAccount.type >= 2 && myAccount.type <= 5 && config.plugins.paypal && config.plugins.paypal.use) {
      tg.sendKeyboard('تمدید', telegramId, {
        inline_keyboard: [[{
          text: '💼برای تمدید اینجا کلیک کنید ' + myAccount.port,
          callback_data: `paypal:accountId[${ myAccount.id }]`,
        }]],
      });
    }
  } else if(isCallbackServer(message)) {
    const telegramId = message.callback_query.from.id.toString();
    const accountId = message.callback_query.data.match(/^accountId\[(\d{1,})\]serverId\[\d{1,}\]$/)[1];
    const serverId = message.callback_query.data.match(/^accountId\[\d{1,}\]serverId\[(\d{1,})\]$/)[1];
    const userId = await isUser(telegramId);
    const myAccount = (await account.getAccount({ userId, id: +accountId }))[0];
    const myServer = (await server.list()).filter(server => {
      return server.id === +serverId;
    }).map(server => {
      if(server.host.indexOf(':') >= 0) {
        const hosts = server.host.split(':');
        const number = Math.ceil(Math.random() * (hosts.length - 1));
        server.host = hosts[number];
      }
      return server;
    })[0];
    if(!myAccount || !myServer) { return; }
    let returnMessage = 'اطلاعات حساب\n\n';
const ssurl=createAccQrCode(myServer,myAccount)
    //const ssurl = 'ss://' + Buffer.from(`${ smyServer.method }:${ myAccount.password }@${ myServer.host }:${ myAccount.port }`).toString('base64');
    returnMessage += `host：${ myServer.host }\nport：${ myAccount.port }\n`;
    if (myServer.type=== 'Shadowsocks') 
    returnMessage +=`کلمه عبور：${ myAccount.password }\nرمزگذاری：${ myServer.method }\n\n`;
    //returnMessage+='جهت کپی در کلیپبورد روی لینک کلیک کنید';    
    //tg.sendMessage(returnMessage, telegramId);
    if(myAccount.type >= 2 && myAccount.type <= 5) {
      
      let timePeriod = 0;
      if(myAccount.type === 2) { timePeriod = 7 * 86400 * 1000; }
      if(myAccount.type === 3) { timePeriod = 30 * 86400 * 1000; }
      if(myAccount.type === 4) { timePeriod = 1 * 86400 * 1000; }
      if(myAccount.type === 5) { timePeriod = 3600 * 1000; }
      const data = JSON.parse(myAccount.data);
      const expireTime = data.create + data.limit * timePeriod;
      await sleep(250);
      const isExpired = Date.now() >= expireTime ? ' [منقضی شده]' : '';

      const time = {
        '2': 7 * 24 * 3600000,
        '3': 30 * 24 * 3600000,
        '4': 24 * 3600000,
        '5': 3600000,
      };
      const timeArray = [data.create, data.create + time[myAccount.type]];
      if (data.create <= Date.now()) {
        let i = 0;
        while (data.create + i * time[myAccount.type] <= Date.now()) {
          timeArray[0] = data.create + i * time[myAccount.type];
          timeArray[1] = data.create + (i + 1) * time[myAccount.type];
          i++;
        }
      }
      const flowLimit = data.flow * (myAccount.isMultiServerFlow ? 1 : myServer.scale);
      const currentFlow = (await flow.getServerPortFlowWithScale(myServer.id, myAccount.id, timeArray, myAccount.multiServerFlow))[0];
      tg.sendMessage(`جریان:${ prettyFlow(currentFlow) } از ${ prettyFlow(flowLimit) }`, telegramId);
      tg.sendMessage(`تاریخ انقضا: ${ moment(expireTime).format('YYYY-MM-DD HH:mm') }${ isExpired }`, telegramId);
    }
    await sleep(250);
    let tmpst= `[${ ssurl }](${ ssurl })`
    tmpst="\`"+`${ ssurl }`+"\`";
    tg.sendMarkdown(tmpst, telegramId);
    const qrcodeId = crypto.randomBytes(32).toString('hex');
    qrcodeObj[qrcodeId] = { url: ssurl, time: Date.now() };
    tg.sendPhoto(`${ config.plugins.webgui.site }/api/user/telegram/qrcode/${ qrcodeId }`, telegramId);
  } else if(isLogin(message)) {
    const telegramId = message.message.chat.id.toString();
    const userId = await isUser(telegramId);
    const token = crypto.randomBytes(32).toString('hex');
    tokens[token] = {
      userId: +userId,
      time: Date.now(),
    };
    tg.sendKeyboard('وارد شدن', telegramId, {
      inline_keyboard: [[{
        text: 'برای ورود به نسخه وب اینجا را کلیک کنید',
        url: `${ config.plugins.webgui.site }/home/login/telegram/${ token }`
      }]],
    });
  } else if(isCallbackPay(message)) {
    const telegramId = message.callback_query.from.id.toString();
    const accountId = +message.callback_query.data.match(/^paypal:accountId\[(\d{1,})\]$/)[1];
    const userId = await isUser(telegramId);
    const groupInfo = await knex('group').select([
      'group.order as order'
    ])
    .leftJoin('user', 'user.group', 'group.id')
    .leftJoin('account_plugin', 'account_plugin.userId', 'user.id')
    .where({ 'user.id': userId });
    let accountInfo;
    if(accountId) {
      accountInfo = await knex('account_plugin').where({ id: accountId }).then(s => s[0]);
      if(accountInfo && accountInfo.data) { accountInfo.data = JSON.parse(accountInfo.data); }
    }
    const groupOrderInfo = groupInfo[0].order ? JSON.parse(groupInfo[0].order) : null;
    let orders = await orderPlugin.getOrders();
    if(groupOrderInfo) {
      orders = orders.filter(order => {
        return groupOrderInfo.indexOf(order.id) > 0;
      });
    }
    if(!accountId) {
      orders = orders.filter(order => {
        return !order.baseId;
      });
    } else if(accountInfo && accountInfo.orderId) {
      orders = orders.filter(order => {
        return order.id === accountInfo.orderId || order.baseId === accountInfo.orderId;
      });
    } else if(accountInfo && !accountInfo.orderId) {
      orders = orders.filter(order => {
        return !order.baseId;
      });
    }
    
    const paymentArray = [];
    for(const order of orders) {
      if(order.paypal > 0) {
        paymentArray.push([{
          text: `🛒 ${ order.name } ${ order.paypal } ریال`,
          callback_data: `paypal:qrcode:accountId[${ accountId }]type[${ order.id }]`,
        }]);
      }
    }
    tg.sendKeyboard('نوع تمدید را انتخاب کنید：', telegramId, {
      inline_keyboard: paymentArray,
    });
  } else if(isCallbackPayQrcode(message)) {
    const paypal = appRequire('plugins/paypal/index');
    const telegramId = message.callback_query.from.id.toString();
    const accountId = +message.callback_query.data.match(/^paypal:qrcode:accountId\[(\d{1,})\]type\[[0-9]{1,}\]$/)[1];
    const orderId = message.callback_query.data.match(/^paypal:qrcode:accountId\[\d{1,}\]type\[([0-9]{1,})\]$/)[1];
    const userId = (await tg.getUserStatus(telegramId)).id;
    
    const payInfo = await paypal.createOrder(userId, accountId > 0 ? accountId : null, +orderId);
    const qrcodeId = crypto.randomBytes(32).toString('hex');
    qrcodeObj[qrcodeId] = { url: payInfo.link, time: Date.now() };
    tg.sendMarkdown(`برای تکمیل پرداخت لطفاًQR کد زیر را اسکن کنید  \n\nیا [\*روی این لینک کلیک کنید*](${ payInfo.link }) `, telegramId);
    tg.sendPhoto(`${ config.plugins.webgui.site }/api/user/telegram/qrcode/${ qrcodeId }`, telegramId);
  }
});

const qrcodeObj = {};

const qrcode = (req, res) => {
  for(const i in qrcodeObj) {
    if(Date.now() - qrcodeObj[i].time >= 5 * 60 * 1000) {
      delete qrcodeObj[i];
    }
  }
  const id = req.params.qrcodeId;
  const code = qr.image(qrcodeObj[id].url, { type: 'png', size: 7 });
  res.setHeader('Content-type', 'image/png');
  code.pipe(res);
};

const tokens = {};

const login = (req, res) => {
  delete req.session.user;
  delete req.session.type;
  const token = req.body.token;
  for(const t in tokens) {
    if(Date.now() - tokens[t].time > 5 * 60 * 1000) {
      delete tokens[t];
    }
  }
  if(tokens[token] && Date.now() - tokens[token].time <= 5 * 60 * 1000) {
    req.session.user = tokens[token].userId;
    req.session.type = 'normal';
    req.session.save();
    return res.send('success');
  } else {
    return res.status(403).end();
  }
};

exports.qrcode = qrcode;
exports.login = login;
