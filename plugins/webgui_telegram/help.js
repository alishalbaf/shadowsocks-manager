const tg = appRequire('plugins/webgui_telegram/index');
const telegram = appRequire('plugins/webgui_telegram/index').telegram;
const isUser = appRequire('plugins/webgui_telegram/index').isUser;
const isNotUserOrAdmin = appRequire('plugins/webgui_telegram/index').isNotUserOrAdmin;
const config = appRequire('services/config').all();
const knex = appRequire('init/knex').knex;
const isHelp = message => {
  if(!message.message || !message.message.text) { return false; }
  if(!message.message || !message.message.chat || !message.message.chat.type === 'private') { return false; }
  if(!message.message.text.startsWith('راهنما') && message.message.text !== '/start' &&
  !message.message.text.startsWith('برنامه')
  )
   { return false; }
  
  return true;
};

telegram.on('message', async message => {

  if(!isHelp(message)) { return; }
  const telegramId = message.message.chat.id.toString();
  if( message.message.text.startsWith('برنامه')) { 
    tg.sendMarkdown(`\*Android*\n https://play.google.com/store/apps/details?id=com.v2ray.ang&hl=en&gl=US \n\n https://play.google.com/store/apps/details?id=io.nekohasekai.sagernet&hl=en&gl=US`,telegramId);
    tg.sendMarkdown(`\*Windows* \n https://github.com/netchx/netch/releases/download/1.8.5/Netch.7z  `,telegramId);
    tg.sendMarkdown(`\*IOS* \n https://apps.apple.com/am/app/shadowlink-shadowsocks-tool/id1439686518  `,telegramId);
    tg.sendMessage(` لینک اکانت سرویس را از بات کپی کرده و داخل اکانت ها وارد نمایدد ( در ویندوز بعد از ایمپورت مود را روی گلوبال بگذارید)` ,telegramId);

    return;
  }

  const userStatus = await tg.getUserStatus(telegramId);
  const title = (await knex('webguiSetting').select().where({
    key: 'base',
  }).then(success => {
    if (!success.length) { return Promise.reject('settings not found'); }
    success[0].value = JSON.parse(success[0].value);
    return success[0].value;
  })).title;
  const site = config.plugins.webgui.site;

  if(userStatus.status === 'empty') {
    tg.sendKeyboard(`به ربات نیمبها خوش آمدید \n\nلطفا ایمیل  را اینجا وارد کنید تا ثبت نام تکمیل شود\n\nیا برای بازدید از نسخه وب روی دکمه زیر کلیک کنید`, telegramId, {
      inline_keyboard: [[
        {
        text: 'وارد نسخه وب شوید',
        url: site,    
      }
    ]],
    },);
  tg.sendMessage("شما هنوز ثبت نام نکرده اید ایمیل را وارد کنید تا وارد مرحله ثبت نام شوید",telegramId);
  } else if (userStatus.status === 'normal') {
    tg.sendKeyboard('بعد از ساخت اکانت روی دکمه جزییات اکانت زده تا پنل مورد نطر را انتخاب و پرداخت نمایید بعد از پرداخت دوباره روی دکمه جزییات اکانت زده و روی شماره پورت زده و لینک بالای بارکد را داخل کلاینت با کپی کردن ایمپورت کنید', telegramId,
    {
      keyboard: [
      [
        'نمایش و مدیریت اطلاعات اشتراکها💳',
        'راهنما👀'  
      ],
      ['برنامه ها🤖']
    ],
    resize_keyboard: true,
    }
    
    );
  }
});
