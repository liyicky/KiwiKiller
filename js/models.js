var GameState = Backbone.Model.extend({
  defaults: {
    scene: "",
    catCollection: null,
    kiwiCollection: null,
    speedX: 1
  },

  initialize: function() {
    _.bindAll(this);

    this.set("catCollection", new Backbone.Collection());
    this.set("kiwiCollection", new Backbone.Collection());

    var query = new Parse.Query("HighScore");
    query.descending("score");
    query.include("player");
    query.limit(10);
    this.set("highscoreCollection", query.collection());

    this.resetGameData();

    this.get("catCollection").on("run", this.incrementScore);
    this.get("catCollection").on("hit fight", this.decrementLife);
    this.get("catCollection").on("kill", this.cleanUpCat);
    this.get("catCollection").on("remove", this.incrementLevel);
  },

  incrementScore: function() {
    this.set("score", this.get("score") + 1);
  },

  decrementLife: function() {
    this.get("lives", this.get("lives") - 1);
  },

  incrementLevel: function() {
    if (this.get("catCollection").lenght <= 0) {
      this.set("level", this.get("level")+1);
      this.get("speedX", this.get("speedX")+0.25);
      this.addCats();
    }
  },

  addCats: function() {
    var numCats = 10;
    for (var i=1;i<numCats;i++) {
      this.get("catCollection").add(new CatModel({
        collectionIndex: i
      }));
    }
  },

  cleanUpCat: function(catModel) {
    this.get("catCollection").remove(catModel);
  },

  addKiwi: function() {
    this.get("kiwiCollection").add(new KiwiModel({
      collectionIndex: 1
    }));
  },

  resetGameData: function() {
    this.set(GameState.DefaultGameData);
  },

  getScoreSubmission: function() {
    return ((this.get("level") * 362) << 5) + "." + ((this.get("score") * 672) << 4);
  }
}, {

  DefaultGameData: {
    score: 0,
    lives: 3,
    level: 1,
    speedX: 1
  }
});



var KiwiModel = Backbone.Model.extend({
  defaults: {
    spriteIndex: 1,
    collectionIndex: 0
  },

  initialize: function() {
    _.bindAll(this);
  }
});

var CatModel = Backbone.Model.extend({
  defaults: {
    spriteIndex: 1,
    collectionIndex: 0
  },

  initialize: function() {
    _.bindAll(this);
  },

  nextSprite: function() {
    this.set("spriteIndex", this.get("spriteIndex") + 1);
    if (this.isSafe()) {
      this.trigger("run", [this]);
    }
  },

  isSafe: function() {
    return this.get("spriteIndex") >= CatModel.NumSprites;
  },

  catHitKiwi: function() {
    if (!this.isSafe()) {
      this.trigger("fight", [this]);
    }
  }
}, {
  NumSprites: 5
});
