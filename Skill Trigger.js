// Selection Check
var pilot = "";
if (canvas.tokens.controlled.length === 1) {
    if (canvas.tokens.controlled[0].actor.type==="pilot") {
	    pilot = canvas.tokens.controlled[0].actor;
    } else if (canvas.tokens.controlled[0].actor.type==="mech") {
        pilot = canvas.tokens.controlled[0].actor.system.pilot.value;
    } else {
        return ui.notifications.warn("No pilot related to selected token found, please select from available pilots", {})
    };
} else {
    let ownedPilots = game.actors.filter(i=>i.type==="pilot").filter(j=>j.testUserPermission(game.user, "OWNER")) // Get pilots owned by user
    if (ownedPilots.length === 0) {
        return ui.notifications.warn("You have no assigned pilots", {}); // Warn for contigency that somehow a player has no pilot
    } else if (ownedPilots.length === 1) {
        pilot = ownedPilots[0]; // Easy case, what will generally happen
    } else { // Hard case where a player has multiple pilots, for some reason
        await Dialog.wait({
            title:"Pilot Selection",
            buttons: ownedPilots.map((possPilot) => {
                let labelText = possPilot.name;
                if (possPilot.system.callsign !== "") {
                    labelText = labelText+" :: "+possPilot.system.callsign; // Little bit of formatting to make things look nice
                }
                return {
                    label:`
                        <div style="display: flex; align-items: center; margin-bottom: 1px; width: 300px;">
                            <div style="width: 40px; height: 40px; overflow: hidden; margin-right: 10px;">
                            <img src="${possPilot.img}" style="width: 100%; height: auto;">
                            </div>
                            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;">// ${labelText} //</span>
                        </div>
                    `,
                    callback:async()=>{
                        pilot = possPilot;
                    }
                }
            }),
            close:()=>{}
        })
    }
};

let allSkills = game.packs.get("world.pilot-items").index.filter(i=>i.type==="skill"); // Create array from skills contained in loaded LCPs
allSkills = allSkills.concat(game.items.filter(i=>i.type==="skill")); // Add self-made skills to the array
allSkills = allSkills.sort((a, b) => a.name.localeCompare(b.name)); // Sorts the triggers alphabetically for better formatting later

var pilotSkills = pilot.items.filter(i=>i.type==="skill"); // Defines the skills for the using pilot

var bonus = 0;
await Dialog.wait({
    title:"Skill Trigger",
    content:`
        <script>
            function onInput() {
                let pilotSkills = game.actors.get("${pilot._id}").items.filter(i=>i.type==="skill"); // Redefine this because the script tag sucks
                var val = document.getElementById("input").value;
                var opts = document.getElementById("select").children;
                for (i of opts) {
                    if (i.value === val) {
                        // An item was selected from the list!
                        if (pilotSkills.length === 0) { // If a pilot has no skills, default the displayed bonus to 0
                            bonus = 0;
                        };
                        for (j of pilotSkills) {
                            if (i.value === j.name) { // If the chosen skill is on the player, set the bonus accordingly
                                bonus = j.system.curr_rank*2;
                                break;
                            };
                            bonus = 0; // Default if skill not found on pilot
                        }
                        document.getElementById("span").innerHTML="+"+bonus; // Update displayed bonus
                        break;
                    }
                }
            }
        </script>
        <form>
            <div style="text-align:center">
                <h3>
                    Select Skill Trigger
                </h3>
            </div>
            <div style="font-size:18px">
            <input list='select' name='select' id='input' oninput='onInput()' style="width:70%; font-size:18px">
            <datalist class='form-control' id='select'>
                ${allSkills.map(a=>`<option value="${a.name}">${a.name}</option>`)})
            </datalist>
            &nbsp; Bonus: <b><span id="span">+0</span></b>
            </div>
            <hr>
        </form>
    `,
    buttons:{
        confirm:{
            label:"Confirm",
            callback:async(html)=>{
                let skill = allSkills.find(i=>i.name===html.find('[name=select]')[0].value);
                console.log(skill)
                for await(i of pilotSkills) {
                    if (i.name === skill.name) {
                        console.log("Pilot owns this skill");
                        let flow = new(game.lancer.flows.get("StatRollFlow"))(i);
                        await flow.begin();
                        return;
                    }
                }
                console.log("Pilot has no bonus in this skill")
                let skillConfig = {
                    title: skill.name,
                }
                let flow = new(game.lancer.flows.get("StatRollFlow"))(pilot, skillConfig);
                await flow.begin()
            }
        },
        cancel:{
            label:"Cancel",
            callback:()=>{}
        }
    },
    close:{}
}, {top:100});