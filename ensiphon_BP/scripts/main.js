import { world, system, Player, ItemStack, EnchantmentType, EntityInventoryComponent, ItemEnchantableComponent, EquipmentSlot, EntityEquippableComponent } from "@minecraft/server";
import { ActionFormData, ModalFormData } from "@minecraft/server-ui";

console.log("Enchantment Siphon Script Initializing...");

const SIPHON_BLOCK_ID = "ensiphon:enchantment_siphon";
const REQUIRED_ITEM_FOR_SIPHON = "minecraft:book";
const XP_COST_PER_LEVEL = 1; // Adjusted cost

const playersUsingSiphon = new Set();

function toRoman(num) {
    if (num < 1 || num > 10) return num.toString();
    const roman = { M: 1000, CM: 900, D: 500, CD: 400, C: 100, XC: 90, L: 50, XL: 40, X: 10, IX: 9, V: 5, IV: 4, I: 1 };
    let str = '';
    for (let i of Object.keys(roman)) {
        let q = Math.floor(num / roman[i]);
        num -= q * roman[i];
        str += i.repeat(q);
    }
    return str;
}

function formatEnchantmentName(enchantment) {
     if (!enchantment || !enchantment.type || typeof enchantment.level === 'undefined') {
         return "Invalid Enchantment";
     }
     const name = enchantment.type.id.replace('minecraft:', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
     const levelRoman = toRoman(enchantment.level);
     return `${name} (${levelRoman})`;
}

function performSiphon(player, slotIndex, selectedEnchantment, xpCost) {
    const inventory = player.getComponent('inventory');
    if (!inventory?.container) {
        player.sendMessage("§cError accessing your inventory.");
        return false;
    }
    const container = inventory.container;

    const itemStack = container.getItem(slotIndex);
    if (!itemStack) {
        player.sendMessage("§cItem missing from original slot!");
        return false;
    }

    let bookFoundAndConsumed = false;
    for (let i = 0; i < container.size; i++) {
        const slotItem = container.getItem(i);
        if (slotItem?.typeId === REQUIRED_ITEM_FOR_SIPHON) {
             const bookEnch = slotItem.getComponent('minecraft:enchantable');
             if (!bookEnch || bookEnch.getEnchantments().length === 0) {
                 if (slotItem.amount > 1) { slotItem.amount--; container.setItem(i, slotItem); }
                 else { container.setItem(i, undefined); }
                 bookFoundAndConsumed = true; break;
             }
        }
    }
    if (!bookFoundAndConsumed) {
        player.sendMessage("§cCould not find or consume the required Book.");
        return false;
    }

    let xpDeducted = false;
    try {
        const levelBefore = player.level;
        player.addLevels(-xpCost);
        if (player.level < levelBefore) { xpDeducted = true; }
    } catch (e) {
        console.error(`Error deducting XP: ${e}`);
        player.sendMessage("§cError deducting experience levels.");
        // Consider giving book back here?
        return false;
    }
    if (!xpDeducted) {
        player.sendMessage("§cFailed to deduct experience levels.");
         // Consider giving book back here?
        return false;
    }

    let enchantmentRemoved = false;
    try {
        const enchantableComponent = itemStack.getComponent('minecraft:enchantable');
        if (!enchantableComponent || typeof enchantableComponent.removeEnchantment !== 'function') { throw new Error("Missing enchant component/method on item"); }
        enchantableComponent.removeEnchantment(selectedEnchantment.type);
        const remainingEnchants = enchantableComponent.getEnchantments();
        if(!remainingEnchants.some(e => e.type.id === selectedEnchantment.type.id)) { enchantmentRemoved = true; }
        else { console.warn(`Verification failed: ${selectedEnchantment.type.id} still exists.`); }
         container.setItem(slotIndex, itemStack);
    } catch (e) {
        console.error(`Error removing enchantment: ${e}`);
        player.sendMessage("§cError modifying the item's enchantments.");
        // Give back book/XP?
        return false;
    }

    let bookCreatedAndEnchanted = false;
    try {
        const enchantedBook = new ItemStack('minecraft:enchanted_book', 1);
        const bookEnchantable = enchantedBook.getComponent('minecraft:enchantable');
        if (!bookEnchantable || typeof bookEnchantable.addEnchantment !== 'function') { throw new Error("Book component error"); }
        const enchantmentToAdd = { type: selectedEnchantment.type, level: selectedEnchantment.level };
        bookEnchantable.addEnchantment(enchantmentToAdd);
        const bookEnchants = bookEnchantable.getEnchantments();
        if (!bookEnchants.some(e => e.type.id === enchantmentToAdd.type.id && e.level === enchantmentToAdd.level)) { throw new Error("Verify enchant on book failed"); }
        else { bookCreatedAndEnchanted = true; }
        container.addItem(enchantedBook);
    } catch (e) {
         console.error(`Error creating/giving book: ${e}`);
         player.sendMessage("§cError creating the enchanted book!");
         return false;
    }

    return bookFoundAndConsumed && xpDeducted && enchantmentRemoved && bookCreatedAndEnchanted;
}


async function showEnchantmentSelectionForm(player, itemStack, slotIndex) {
    const enchantableComponent = itemStack.getComponent('minecraft:enchantable');
    let enchantmentsList = [];
    try { enchantmentsList = enchantableComponent?.getEnchantments() ?? []; } catch (e) { return; }
    if (!Array.isArray(enchantmentsList) || enchantmentsList.length === 0) { return; }

    const form = new ActionFormData();
    form.title("Select Enchantment");
    const itemName = itemStack.nameTag ?? itemStack.typeId.split(':')[1];
    form.body(`Select enchantment from ${itemName} (Slot ${slotIndex}).\nRequires 1 Book & XP.`);

    const validEnchantments = [];
    for (const enchantment of enchantmentsList) {
        if (enchantment && enchantment.type && typeof enchantment.level !== 'undefined') {
             const cost = enchantment.level * XP_COST_PER_LEVEL;
             const buttonText = `${formatEnchantmentName(enchantment)} (§e${cost} XP§r)`;
             form.button(buttonText);
             validEnchantments.push(enchantment);
        }
    }

    try {
        const result = await form.show(player);
        if (result.canceled) { return; }

        if (typeof result.selection === 'number') {
            const selectedIndex = result.selection;
            const selectedEnchantment = validEnchantments[selectedIndex];

            if (selectedEnchantment) {
                const xpCost = selectedEnchantment.level * XP_COST_PER_LEVEL;
                 const inventory = player.getComponent('inventory');
                 let hasBook = false;
                 if(inventory?.container) {
                    for (let i = 0; i < inventory.container.size; i++) {
                         const slotItem = inventory.container.getItem(i);
                         if (slotItem?.typeId === REQUIRED_ITEM_FOR_SIPHON) {
                            const bookEnch = slotItem.getComponent('minecraft:enchantable');
                            if (!bookEnch || bookEnch.getEnchantments().length === 0) { hasBook = true; break; }
                         }
                    }
                 }
                 if (!hasBook) { player.sendMessage("§cYou need a non-enchanted Book."); return; }

                 const currentLevel = player.level;
                if (currentLevel < xpCost) { player.sendMessage(`§cNot enough XP. (Need ${xpCost})`); return; }

                if (performSiphon(player, slotIndex, selectedEnchantment, xpCost)) {
                    player.sendMessage(`§aSiphoned ${formatEnchantmentName(selectedEnchantment)} successfully!`);
                } else {
                     player.sendMessage("§cSiphoning process failed.");
                }
            }
        }
    } catch (error) { console.error("Error showing/handling Enchantment form:", error); player.sendMessage("§cForm Error."); }
}

async function showItemSelectionForm(player) {
    const inventory = player.getComponent('inventory');
    if (!inventory?.container) { player.sendMessage("§cCould not access inventory."); return; }
    const container = inventory.container;
    const enchantedItems = [];
    for(let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (!item) continue;
        try {
            const enchantComp = item.getComponent('minecraft:enchantable');
            if (enchantComp && enchantComp.getEnchantments().length > 0) {
                enchantedItems.push({ itemStack: item, slotIndex: i });
            }
        } catch(e) { }
    }

    if (enchantedItems.length === 0) { player.sendMessage("§eNo enchanted items found in your inventory."); return; }

    const form = new ActionFormData();
    form.title("Select Item to Siphon");
    form.body("Choose an enchanted item from your inventory.");

    enchantedItems.forEach(({ itemStack, slotIndex }) => {
        const itemName = itemStack.nameTag ?? itemStack.typeId.split(':')[1];
        const buttonLabel = `${itemName} (Slot ${slotIndex})`;
        form.button(buttonLabel);
    });

    try {
        const result = await form.show(player);
        if (result.canceled) { return; }

        if (typeof result.selection === 'number') {
            const selectedItemInfo = enchantedItems[result.selection];
            if (selectedItemInfo) {
                 system.run(() => {
                     showEnchantmentSelectionForm(player, selectedItemInfo.itemStack, selectedItemInfo.slotIndex)
                         .catch(e => console.error("Error in stage 2 (showEnchantmentSelectionForm):", e));
                 });
            }
        }
    } catch(error) { console.error("Error showing/handling Item Selection form:", error); player.sendMessage("§cItem Selection Menu Error."); }
}

system.run(() => {
    world.beforeEvents.playerInteractWithBlock.subscribe(eventData => {
        const player = eventData.player;
        const targetBlock = eventData.block;
        if (!(player instanceof Player)) return;
        if (playersUsingSiphon.has(player.id)) return; // Cooldown check

        if (targetBlock?.typeId === SIPHON_BLOCK_ID) {
            eventData.cancel = true;
            playersUsingSiphon.add(player.id);

            system.run(async () => {
                 try {
                     await showItemSelectionForm(player);
                 } catch (formError) {
                     console.error("Error executing showItemSelectionForm:", formError);
                     player.sendMessage("§cError opening Siphon menu.");
                 }
                 finally {
                     playersUsingSiphon.delete(player.id);
                 }
            });
        }
    });
    console.log("Enchantment Siphon interaction script setup complete.");
});

console.log("Enchantment Siphon Script Setup Complete (system.run scheduled).");