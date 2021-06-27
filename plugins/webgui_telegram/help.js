const tg = appRequire('plugins/webgui_telegram/index');
const telegram = appRequire('plugins/webgui_telegram/index').telegram;
const isUser = appRequire('plugins/webgui_telegram/index').isUser;
const isNotUserOrAdmin = appRequire('plugins/webgui_telegram/index').isNotUserOrAdmin;
const config = appRequire('services/config').all();
const knex = appRequire('init/knex').knex;

const isHelp = message => {
  if(!message.message || !message.message.text) { return false; }
  if(!message.message || !message.message.chat || !message.message.chat.type === 'private') { return false; }
  if(message.message.text.trim() !== 'help' && message.message.text !== '/start') { return false; }
  return true;
};

telegram.on('message', async message => {
  if(!isHelp(message)) { return; }
  const telegramId = message.message.chat.id.toString();
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
    tg.sendKeyboard(`به ${ title } خوش آمدید \n\nلطفا ایمیل خود را اینجا وارد کنید تا کد تأیید برای ثبت نام یک حساب را دریافت کنید\n\nیا برای بازدید از نسخه وب روی دکمه زیر کلیک کنید`, telegramId, {
      inline_keyboard: [[{
        text: 'وارد نسخه وب شوید',
        url: site,
      }]],
    });
  } else if (userStatus.status === 'normal') {
    tg.sendKeyboard('لیست دستورالعمل ها：\n\naccount: نمایش دادن اطلاعات اکانت\nlogin: ورود به سیستم سریع نسخه وب', telegramId,
    {
      keyboard: [[{
        text: 'نمایش دادن اطلاعات حساب و اکانت',
      },
      {text:'help'}  
    ]],
    resize_keyboard: true,
    }
    
    );
  }
});
