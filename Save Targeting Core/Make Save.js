// Generic macro to allow for save targeting effects
// Ensure macro is named "Make Save"
// Run as "Everyone" using Advanced Macros

// Passed arguments:
// tokenIds - Array of target IDs
// originatorId - Token Id
// saveConfig - statFlowParams
// passCard - simpleTextParams
// passDamage - damageFlowParams
// passStatuses - Array statcond lids
// passApply - Boolean: set to false to remove passed statcond
// failCard - simpleTextParams
// failDamage - damageFlowParams
// failStatuses - Array statcond lids
// failApply - Boolean: set to false to remove passed statcond

const originator = canvas.tokens.get(scope.originatorId);
const save = originator.actor.system.save;

// Data handling code, ensures that a specific flag is always at its required starting null value
if (typeof originator.document.getFlag("world", "saveEffectCheck") !== "undefined" && originator.actor.testUserPermission(game.user, "OWNER")) {
	originator.document.unsetFlag("world", "saveEffectCheck");
};

const saveConfig = scope.saveConfig;
var passCard = scope.passCard;
if (typeof passCard === "undefined") {
	passCard = false
};
var failCard = scope.failCard;
if (typeof failCard === "undefined") {
	failCard = false
};

const passDamage = scope.passDamage;
const passStatuses = scope.passStatuses;
const passApply = scope.passApply;
const failDamage = scope.failDamage;
const failStatuses = scope.failStatuses;
const failApply = scope.failApply;

let passes = [];
let fails = [];
for await(i of scope.tokenIds) {
	let token = canvas.tokens.get(i)
	let permList = []
	// Create list of users with "OWNER" permissions to this token
	for await (j of game.users.contents) {
		if (token.actor.testUserPermission(j, "OWNER")) {
			permList.push(j)
		}
	};

	// If a player other than the GM has "OWNER" perms, let this resolve on their end
	if (permList.length > 1) {
		for (j in permList) {
			if (permList[j].isGM) {
				permList.splice(j, 1);
			};
		};
	};

	// Stop if player not permitted
	if (!permList.includes(game.user)) {
		continue;
	};

	// Data handling, ensure that previous lingering flags are removed
	await token.document.unsetFlag("world", "pass");
	await token.document.unsetFlag("world", "fail");

	//Initialise flow
	try {
		const rollFlow = new(game.lancer.flows.get("StatRollFlow"))(token.actor, saveConfig); // Force save flow
		await rollFlow.begin();
		const rolled = game.messages?.contents.reverse()[0].rolls[0]._total; // Get roll from save flow
		if (rolled < save) {
			if (failCard !== false) {
				const failFlow = new(game.lancer.flows.get("SimpleTextFlow"))(token.actor, failCard); // Run the effect card
				await failFlow.begin();
			};
			await token.document.setFlag("world", "fail", true); // Set flag on target denoting fail state
		} else {
			if (passCard !== false) {
				const passFlow = new(game.lancer.flows.get("SimpleTextFlow"))(token.actor, passCard); // Run the effect card
				await passFlow.begin();
			};
			await token.document.setFlag("world", "pass", true); // Set flag on target denoting pass state
		};
	} catch {
		continue;
	};
};

//Apply effects
await game.macros.getName("Save Effect").execute({
	tokenId:scope.originatorId,
    targetIds:scope.tokenIds, 

	passDamage:passDamage, 
	passStatuses:passStatuses,
	passApply:passApply,

	failDamage:failDamage,
	failStatuses:failStatuses,
	failApply:failApply,
});