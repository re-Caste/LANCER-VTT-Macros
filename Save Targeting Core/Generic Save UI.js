// Stop if no token selected
if (canvas.tokens.controlled.length !== 1) {
	return ui.notifications.warn('Please select exactly 1 token.', {})
};

const token = canvas.tokens.controlled[0];
const target = game.user.targets.first();
const save = token.actor.system.save

// Define arrays that we can map to lists as needed
let aoeCompendium = game.packs.get("lancer.core_macros").index.filter(i=>/\d/.test(i.name)).sort((a,b)=>a.name.localeCompare(b.name))
let saveTypes = ["HULL","AGI","SYS","ENG"]
let damageTypes = ["Kinetic", "Energy", "Explosive", "Burn", "Heat", "Variable"]

// Create the main UI
await Dialog.wait({
    title:"Force saves",
    content:`
        <form>
            <div style="text-align:center">
                <h3>
                    Targeting
                </h3>
            </div>
            <div class="form-group">
                Target:&nbsp;
                <select id="targeting" name="targeting">
                    <option value="Single Target">Single Target</option>
                    ${aoeCompendium.map(a=>`<option value="${a.name}">${a.name}</option>`)})
                </select>
                &nbsp; Save type:&nbsp
                <select id="saveType" name="saveType">
                    ${saveTypes.map(b=>`<option value="${b}">${b}</option>`)})
                </select>
            </div>
            <hr>
            <div style="text-align:center">
                <h3>
                    Pass Configuration
                </h3>
            </div>
            <div class="form-group">
                Damage:&nbsp;
                <select id="passDamageType" name="passDamageType">
                    ${damageTypes.map(c=>`<option value="${c}">${c}</option>`)})
                </select>
                &nbsp; Value:&nbsp
                <input id="passDamageVal" name="passDamageVal" type="text" value="1d6">
            </div>
            <div class="form-group">
                <!-- I want this to be a dropdown with checkboxes, but this has to do for now -->
                Status 1:&nbsp;
                <select id="passStat1" name="passStat1" style="width:50%">
                    <option value="none">None</option>
                    ${CONFIG.statusEffects.map(d => `<option value="${d.id}">${game.i18n.localize(d.name)}</option>`)}
                </select>
                &nbsp; Status 2:&nbsp;
                <select id="passStat2" name="passStat2" style="width:50%">
                    <option value="none">None</option>
                    ${CONFIG.statusEffects.map(e => `<option value="${e.id}">${game.i18n.localize(e.name)}</option>`)}
                </select> 
            </div>
            <div class="form-group">
                &nbsp; Other effects:&nbsp
                <input id="passOtherEffects" name="passOtherEffects" type="text" value="" style:"width:100%">
            </div>
            <hr>
            <div style="text-align:center">
                <h3>
                    Fail Configuration
                </h3>
            </div>
            <div class="form-group">
                Damage:&nbsp;
                <select id="failDamageType" name="failDamageType">
                    ${damageTypes.map(f=>`<option value="${f}">${f}</option>`)})
                </select>
                &nbsp; Value:&nbsp
                <input id="failDamageVal" name="failDamageVal" type="text" value="1d6">
            </div>
            <div class="form-group">
                <!-- I want this to be a dropdown with checkboxes, but this has to do for now -->
                Status 1:&nbsp;
                <select id="failStat1" name="failStat1" style="width:50%">
                    <option value="none">None</option>
                    ${CONFIG.statusEffects.map(g => `<option value="${g.id}">${game.i18n.localize(g.name)}</option>`)}
                </select>
                &nbsp; Status 2:&nbsp;
                <select id="failStat2" name="failStat2" style="width:50%">
                    <option value="none">None</option>
                    ${CONFIG.statusEffects.map(h => `<option value="${h.id}">${game.i18n.localize(h.name)}</option>`)}
                </select> 
            </div>
            <div class="form-group">
                &nbsp; Other effects:&nbsp
                <input id="failOtherEffects" name="failOtherEffects" type="text" value="" style:"width:100%">
            </div>
        </form>
        <hr>
    `,
    buttons:{
        ok:{
            label:"OK",
            callback:async(html)=>{
                // Set all collected values from Dialog
                let targeting = html.find('[name=targeting]')[0].value;
                let saveType = html.find('[name=saveType]')[0].value;
                let passDamageType = html.find('[name=passDamageType]')[0].value;
                let passDamageVal = html.find('[name=passDamageVal]')[0].value;
                let passStat1 = html.find('[name=passStat1]')[0].value;
                let passStat2 = html.find('[name=passStat2]')[0].value;
                let passOtherEffects = html.find('[name=passOtherEffects]')[0].value;
                let failDamageType = html.find('[name=failDamageType]')[0].value;
                let failDamageVal = html.find('[name=failDamageVal]')[0].value;
                let failStat1 = html.find('[name=failStat1]')[0].value;
                let failStat2 = html.find('[name=failStat2]')[0].value
                let failOtherEffects = html.find('[name=failOtherEffects]')[0].value;

                // Call AoE Targeting Macro if needed
                if (targeting !== "Single Target") {
                    let compendium = game.packs.get("lancer.core_macros")
                    await compendium.getDocument(compendium.index.find(i=>i.name===targeting)._id).then(j=>j.execute());
                };

                // Populate configs from collected values
                const saveConfig = {
                    title: "Save :: "+saveType,
                    path: "system."+saveType.toLowerCase(),
                    total: token.actor.system.save,
                };

                const passConfig = {
                    title: "Effect :: Pass",
                    description: passOtherEffects
                };

                const failConfig = {
                    title: "Effect :: Fail",
                    description: failOtherEffects
                };		

                const dmgConfigPass = {
                    title: "Pass Damage",
                    damage: [{type: passDamageType, val:passDamageVal.toString()}]
                };

                const dmgConfigFail = {
                    title: "Fail Damage",
                    damage: [{type: failDamageType, val:failDamageVal.toString()}],
                };
                
                const passStatuses = []
                for await(i of [passStat1, passStat2])
                if (i !== "none") {
                    passStatuses.push(i)
                };

                const failStatuses = []
                for await(i of [failStat1, failStat2])
                if (i !== "none") {
                    failStatuses.push(i)
                };

                await Dialog.wait({
                    title:"Confirm AoE Placement",
                    content:"Ensure selected targets are correct // Esc to cancel",
                    buttons:{
                        yes:{
                            label:"Confirm",
                            callback:async()=> {
                                const targets = Array.from(game.user.targets);

                                let targetIds = [];
                                for await(i of targets){
                                    targetIds.push(i.document._id)
                                };

                                await game.macros.getName("Make Save").execute({
                                    tokenIds:targetIds,
                                    originatorId:token.document._id,
                                    saveConfig:saveConfig,
                                    passConfig: passConfig,
                                    failConfig: failConfig,
                                    passEffect: [passStatuses,dmgConfigPass],
                                    failEffect: [failStatuses,dmgConfigFail]
                                });
                            }
                        }
                    },
                    close:async()=>{
                        // Clean up template from canvas
                        canvas.templates.placeables.reverse()[0].document.delete()
                    }
                }, {top:100});
            }
        },
        cancel:{
            label:"Cancel",
            callback:()=>{
                return;
            }
        }
    }
});