var requestCard = require('mtg-card-sync');
var fs = require('fs');
var pathFn = require('path');
var ejs = require('ejs');

var deckTmplThemeSrc = pathFn.join(hexo.theme_dir, 'plugins/mtg-deck/deck.ejs');
var deckTmplOriginalSrc = pathFn.join(__dirname, './deck.ejs');
var deckTmplSrc = (fs.existsSync(deckTmplThemeSrc)? deckTmplThemeSrc: deckTmplOriginalSrc);

var deckTmpl = ejs.compile(
  fs.readFileSync(deckTmplSrc, {encoding: 'utf8'}),
  {}
  );

var parseDeckList = function(deckList) {
  var mainboard = [];
  var sideboard = [];
  var isMainboard = true;

  var regexCardSlot = /^([0-9]+)\s(.*)(?:\r|\n|$)/;
  var regexSideboard = /^(?:\r|\n)/;

  while(deckList.length > 0) {
    if (deckList.match(regexCardSlot)) {
      deckList = deckList.replace(regexCardSlot, function(all, count, cardName) {
        var slot = {
          count: parseInt(count, 10),
          card: requestCard(cardName, true)
        };
        if (isMainboard) {
          mainboard.push(slot);
        } else {
          sideboard.push(slot);
        }
        return '';
      });
      continue;
    }
    if (deckList.match(regexSideboard)) {
      deckList = deckList.replace(regexSideboard, '');
      isMainboard = false;
      continue;
    }
    deckList = deckList.replace(/^.*(?:\r|\n)?/, '');
    deckList = deckList.trim();
  }

  return {
    mainboard: mainboard,
    sideboard: sideboard
  };
};

var getDataUrl = function(deckList) {
  deckList = deckList.replace(/\r?\n/g, '\r');
  var buf = new Buffer(deckList, 'utf8');
  return 'data:text/plain;base64,' + buf.toString('base64');
};

var deckNameRegex = /\s-\s(.+)/;

hexo.extend.tag.register('mtg_deck', function(args, content) {
  var deckName = args.join(' ');
  var deckDescription = '';
  if (deckName.match(deckNameRegex)) {
    deckName = deckName.replace(deckNameRegex, function(all, description) {
      deckDescription = description;
      return '';
    });
  }
  var deckList = parseDeckList(content);
  var uri = getDataUrl(content);

  return deckTmpl({name: deckName, description: deckDescription, deckList: deckList, uri: uri}).replace(/(?:\r|\n)/g, '');
}, {ends: true});

hexo.extend.tag.register('mtg_deck_asset', function(args) {
  var PostAsset = ctx.model('PostAsset');

  var slug = args.shift();
  if (!slug) {
    return '';
  }

  var asset = PostAsset.findOne({post: this._id, slug: slug});
  if (!asset) return '';

  var deckName = args.join(' ');
  var deckDescription = '';
  if (deckName.match(deckNameRegex)) {
    deckName = deckName.replace(deckNameRegex, function(all, description) {
      deckDescription = description;
      return '';
    });
  }
  var deckList = parseDeckList(fs.readFileSync(asset.source));
  var uri = ctx.config.root + asset.path

  return deckTmpl({{name: deckName, description: deckDescription, deckList: deckList, uri: uri}).replace(/(?:\r|\n)/g, '');;
});