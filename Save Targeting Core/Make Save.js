// Generic macro to allow for save targeting effects
// Run as "Everyone" using Advanced Macros

// Passed arguments: 
// tokenIds - Array of target IDs, 
// originatorId - Token Id, 
// saveConfig - statFlowParams, 
// passEffect - simpleTextParams, 
// failEffect - simpleTextParams, 
// passConfig - Array in form [[status lids], dmgParams], 
// failConfig - Array in form [[status lids], dmgParams],

const originator = canvas.tokens.get(scope.originatorId)

// Data handling check
if (typeof originator.document.getFlag("world", "saveEffectCheck") !== "undefined") {
    originator.document.unsetFlag("world", "saveEffectCheck");
};

const tokens = []
for await (i of scope.tokenIds) {
	tokens.push(canvas.tokens.get(i))
};

const saveConfig = scope.saveConfig;
const passCard = scope.passCard;
const failCard = scope.failCard;

const passDamage = scope.passDamage;
const passStatuses = scope.passStatuses;
const failDamage = scope.failDamage;
const failStatuses = scope.failStatuses;

let passes = [];
let fails = [];
for await(token of tokens) {
	const save = token.actor.system.save;
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

	//Initialise flow
	try {
		await canvas.tokens.selectObjects(originator) // Ensure original token is selected
		const rollFlow = new(game.lancer.flows.get("StatRollFlow"))(token.actor, saveConfig); // Force save flow
		await rollFlow.begin();
		const rolled = game.messages?.contents[game.messages?.contents.length - 1].rolls[0]._total; // Get roll from save flow
		if (rolled < save) {
			const failFlow = new(game.lancer.flows.get("SimpleTextFlow"))(token.actor, failCard); // Run the effect card
			await failFlow.begin();
			await token.document.setFlag("world", "fail", true); // Set flag on target denoting fail state
		} else {
			const passFlow = new(game.lancer.flows.get("SimpleTextFlow"))(token.actor, passCard); // Run the effect card
			await passFlow.begin();
			await token.document.setFlag("world", "pass", true); // Set flag on target denoting pass state
		};
	} catch {
		continue;
	};
};

//Apply effects
await game.macros.getName("Save Effect").execute({
	tokenId:originatorId,
    targetIds:scope.tokenIds, 

	passDamage:scope.passDamage, 
	passStatuses:scope.passStatuses,

	failDamage:scope.failDamage,
	failStatuses:scope.failStatuses,
});