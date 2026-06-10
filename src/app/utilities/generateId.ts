export const generateRandomId=(length = 10) =>{
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef";
  let randomId = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    randomId += characters[randomIndex];
  }

  return randomId;
}
