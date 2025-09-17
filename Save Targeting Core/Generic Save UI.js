// Stop if no token selected
if (canvas.tokens.controlled.length !== 1) {
	return ui.notifications.warn('Please select exactly 1 token.', {})
};

const token = canvas.tokens.controlled[0];
const save = token.actor.system.save

// Define arrays that we can map to lists as needed
let aoeTypes = ["Blast", "Burst", "Cone", "Line"]
let saveTypes = ["HULL","AGI","SYS","ENG"]
let damageTypes = ["Kinetic", "Energy", "Explosive", "Burn", "Heat", "Variable"]

// Token Distance function for use on burst AoE as it scales with token size (lifted from LancerQoL's Engaged automation)
// Everyone say "Thank you, CSMcFarland"
function tokenDistance(t1, t2) {
    const spaces1 = t1.getOccupiedSpaces();
    const spaces2 = t2.getOccupiedSpaces();
    const rays = spaces1.flatMap(s => spaces2.map(t => ({ ray: new Ray(s, t) })));
    return (Math.min(...game.canvas.grid.measureDistances(rays, { gridSpaces: true })));
};

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
                    ${aoeTypes.map(a=>`<option value="${a}">${a}</option>`)})
                </select>
                &nbsp;
                <input id="aoeLength" name="aoeLength" type="text" value="">
                &nbsp; Save type:&nbsp
                <select id="saveType" name="saveType">
                    ${saveTypes.map(b=>`<option value="${b}">${b}</option>`)})
                </select>
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
            <!-- Leaving these out for now as they seem to always be active :/
            <div class="form-group">
                <input type="checkbox" id="overkill" name="overkill" value="true">
                <label for="overkill" style="width:30%">Overkill</label>
                <input type="checkbox" id="paracausal" name="paracausal" value="true">
                <label for="paracausal" style="width:30%">Paracausal</label>
                <input type="checkbox" id="ap" name="ap" value="true">
                <label for="ap" style="width:30%">AP</label>
            </div> 
            -->
            <div class="form-group">
                &nbsp; Other effects:&nbsp
                <input id="failOtherEffects" name="failOtherEffects" type="text" value="" style:"width:100%">
            </div>
            <hr>

            <div style="text-align:center">
                <h3>
                    Pass Configuration
                </h3>
            </div>
            <div class="form-group">
                Damage:&nbsp;
                <select id="passDamage" name="passDamage">
                    <option value=false>Full Damage</option>
                    <option value=true>Half Damage</option>
                    <option value="none">No Damage</option>
                </select>
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
        </form>
        <hr>
    `,
    buttons:{
        ok:{
            label:"OK",
            callback:async(html)=>{
                // Set all collected values from Dialog
                let targeting = html.find('[name=targeting]')[0].value;
                let aoeLength = html.find('[name=aoeLength]')[0].value;
                let saveType = html.find('[name=saveType]')[0].value;

                let failDamageType = html.find('[name=failDamageType]')[0].value;
                let failDamageVal = html.find('[name=failDamageVal]')[0].value;
                let failStat1 = html.find('[name=failStat1]')[0].value;
                let failStat2 = html.find('[name=failStat2]')[0].value
                let failOtherEffects = html.find('[name=failOtherEffects]')[0].value;
//                let overkill = html.find('[name=overkill]')[0].value;
//                let paracausal = html.find('[name=paracausal]')[0].value;
//                let ap = html.find('[name=ap]')[0].value;

                let passDamageMult = html.find('[name=passDamage]')[0].value;
                let passStat1 = html.find('[name=passStat1]')[0].value;
                let passStat2 = html.find('[name=passStat2]')[0].value;
                let passOtherEffects = html.find('[name=passOtherEffects]')[0].value;

                // Call AoE Targeting Macro if needed
                if (targeting !== "Single Target") {
                    if (targeting !== "Burst") {
                        game.lancer.canvas.WeaponRangeTemplate.fromRange({
                            type: targeting,
                            val: aoeLength,
                        }).placeTemplate()
                            .then(t => {
                                if (t) game.lancer.targetsFromTemplate(t.id);
                            }
                        );
                    }
                };
                
                // Populate configs from collected values
                const saveConfig = {
                    title: "Save :: "+saveType,
                    path: "system."+saveType.toLowerCase(),
                    total: token.actor.system.save,
                };

                const passCard = {
                    title: "Effect :: Pass",
                    description: passOtherEffects
                };

                const failCard = {
                    title: "Effect :: Fail",
                    description: failOtherEffects
                };		
                
                if (passDamageMult !== "none") {
                    var passDamage = {
                        title: "Pass Damage",
                        damage: [{type: failDamageType, val:failDamageVal.toString()}],
                        half_damage:(passDamageMult==="true"),
//                        overkill:(overkill==="true"),
//                        paracausal:(paracausal==="true"),
//                        ap:(ap==="true"),
                    };
                };

                const failDamage = {
                    title: "Fail Damage",
                    damage: [{type: failDamageType, val:failDamageVal.toString()}],
//                    overkill:(overkill==="true"),
//                    paracausal:(paracausal==="true"),
//                    ap:(ap==="true"),
                };
                
                const passStatuses = []
                for await(i of [passStat1, passStat2])
                if (i !== "none") {
                    passStatuses.push(i);
                };

                const failStatuses = []
                for await(i of [failStat1, failStat2])
                if (i !== "none") {
                    failStatuses.push(i);
                };

                switch (targeting) {
                    case "Single Target":
                        var content = "Target desired token";
                        break;
                    case "Burst":
                        var content = "Target token for centre of burst"
                        break;
                    default:
                        var content = "Place AoE template"
                        break;
                }

                await Dialog.wait({
                    title:"Confirm Targets",
                    content:`
                            <form>
                                <div style="text-align:center"">
                                    // ${content} //<br>// Ensure selected targets are correct //<br>// Esc to cancel //
                                </div>
                                <hr>
                            </form>
                        `,
                    buttons:{
                        yes:{
                            label:"Confirm",
                            callback:async()=> {
                                if (targeting === "Burst") { // Burst saves aren't typically found in 1st party material, but may be used in place of forcing all adjacent character to save
                                    let tempTargets = [];
                                    let initTarget = game.user.targets.first()
                                    for await(i of canvas.tokens.placeables) {
                                        console.log(Number(aoeLength)+0.1);
                                        if (tokenDistance(initTarget, i) < Number(aoeLength)+0.1 && initTarget !== i) { // Ignore originator of burst
                                            tempTargets.push(i.document._id)
                                        };
                                    };
                                    game.user.updateTokenTargets(tempTargets) // Set targets to all needed for burst
                                };

                                const targets = Array.from(game.user.targets);
                                let targetIds = [];
                                for await(i of targets){
                                    targetIds.push(i.document._id)
                                };

                                await game.macros.getName("Make Save").execute({
                                    tokenIds: targetIds,
                                    originatorId: token.document._id,
                                    saveConfig: saveConfig,

                                    passCard: passCard,
                                    passDamage: passDamage,
                                    passStatuses: passStatuses,

                                    failCard: failCard,
                                    failDamage: failDamage,
                                    failStatuses: failStatuses,
                                });
                            }
                        }
                    },
                    close:async()=>{
                        if (targeting !== "Single Target") {
                            // Clean up template from canvas
                            canvas.templates.placeables.reverse()[0].document.delete()
                        };
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