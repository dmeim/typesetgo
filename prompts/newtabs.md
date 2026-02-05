currently, there is no route that you have to go to to use the typing test component, its just on the home page. i would like to add a tab selector at the top between the logo and top right elements. this tab will have the typing test, which will just be called "Type", another tab called "Race" which will be the new typing racing game, and then a third tab called "Lessons" which will be the typing lessons.

the typing area needs to become, if it isnt already, a reusable component because we will need it in many places, nad i think it would be easier and smarter to have one componenet that takes or has params that we can adjust to fit the usecase, rather than rebuilding a tpying area all over again every time we need it.

the lesson tab will be blank for now, let me go into some more detail about the new Race tab.

--- Race ---
route for deciding page - /race
route for host lobby - /race/lobby/{lobby_uuid}?host=true
route for players lobby - /race/lobby/{lobby_uuid}
route for the actual race - /race/{race_uuid}
route for results - /race/results/{race_uuid}

the user will be presented with a page a card with a button to host a game or a button to join a game and the join will have an accompianying text box that they type the code into from the user who is hosting.


the host, once they click the host button, will be shown a game options that they can set for the game. options will include, but are not limited too, game difficulty (beginner, easy, medium, hard, expert (these are the sme as the Word mode difficulties)) and word count. thats all i can think of right now. they will also be shown the game code that they can share with other users. this will all be on in card.
there will be another card next to that one where they customize their racer as a player. this card will be the same across all racers, its just that the host has the additional card for game options as they are the host. the player card will show thier profile picture if they are signed in and this will be their "character", along with their username, if they are signed in. if they aren't logged in, allow the user to change the name and picture. the picture will only be either the user's profile picture, or they will be allowed to pic from a list of pre-approved emojis. allow the signed in users to change their picture too, but only to an emoji. if they want a different picture, they have to change their account picture. there will be a "Ready" button that they can click to show that they are ready for the race to begin. once all racers, including the host, have hit the ready button, a 5 second countdown will begin. if anyone clicks the button to unready themselves, maybe because they want to change their picture or just isn't ready, the countdown stops, clears, and restarts once all the racers are in the ready state again. once the countdown ends, the race begins.

the racing screen will be split into two horizontal sections, with the top 2/3 being the race course and the bottom 1/3 being the typing area.

we can have different court looks based on length and diffuculty of the words being typed later but for now it will just be a simple left to right, start on the left with the finish line on the right. as the user types the words they are supposed to type, their racer goes further down the course until they reach the end. the test doesnt end when the first person gets to the end. each user's typing time is tracked. once the top 3 finish, the remaining people have 10 seconds to finish before the race forcably ends. then a results screen shows with the first, second, and third place pedastoles, just like on the typing leaderboard, and then all other racers will be below that. there will be a button to either leave the game group that the user is in or to ready up again.

anyone who leaves is brought back to the /race screen where they either have to start a game or join a game, or change theirwebsite mode to some other tab.
anyone who readys up again will be brought back to the lobby page /race/lobby/{lobby_uuid} where they are still in the group with anyone else who readied up, and the process begins again onces all users in the group are ready.

for the actual typing part, it will be a sort of feeding tape of words, that start from the right and continue to the left as the user types. all racers will have the same words to make it fair. the amount of words and difficulty of words were already determined by the host during game setup.





