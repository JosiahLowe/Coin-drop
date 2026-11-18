'use strict';
const RUN_LOOT_CONFIG={maxPotions:3,maxArmor:3,maxSword:5,swordStep:.1,potionOverflow:3,swordOverflow:5,armorOverflow:5};
class RunLoot {
 constructor(awardCoins,config=RUN_LOOT_CONFIG){this.awardCoins=awardCoins;this.config=config;this.reset();}
 get swordLevel(){return this._swordLevel;}
 set swordLevel(value){this._swordLevel=Math.max(0,Math.min(this.config.maxSword,Math.floor(Number(value)||0)));}
 reset(){this.potions=0;this.armor=0;this.swordLevel=0;}
 reach(original){return original*(1+this.config.swordStep*Math.max(0,Math.min(this.config.maxSword,this.swordLevel)));}
 reward(type){
  if(type==='potion'){if(this.potions<this.config.maxPotions){this.potions++;return 'Potion stored ('+this.potions+'/'+this.config.maxPotions+')';}this.awardCoins(this.config.potionOverflow);return 'Potions full · +3 coins';}
  if(type==='sword'){if(this.swordLevel<this.config.maxSword){this.swordLevel++;return 'Sword level '+this.swordLevel+'/'+this.config.maxSword;}this.awardCoins(this.config.swordOverflow);return 'Sword at maximum · +5 coins';}
  if(type==='armor'){if(this.armor<this.config.maxArmor){this.armor++;return 'Armor charge ('+this.armor+'/'+this.config.maxArmor+')';}this.awardCoins(this.config.armorOverflow);return 'Armor full · +5 coins';}
  return null;
 }
 usePotion(combat){const h=combat.health;if(combat.knight.paused||h.dead||h.hearts>=h.config.hearts||!this.potions)return false;this.potions--;h.hearts=Math.min(h.config.hearts,h.hearts+1);combat.onChange(combat);return true;}
}
