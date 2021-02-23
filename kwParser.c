#include <stdio.h>
#include <stdlib.h>
#include <ctype.h>

//Get next word from input stream
//Return EOF upon reaching end of file
int getWord(char *w) {
	char c = getchar();

	//Skip all non alphanumeric chars
	while (!isalnum(c)) {
		if (c == EOF) {
			return EOF;
		}

		c = getchar();
	}

	//Write all alphanumeric chars to w
	int i = 0;
	w[i] = c;
	c = getchar();
	while (isalnum(c) || c == '-' || c == '_') {
		w[++i] = toupper(c);
		c = getchar();
	}
	w[i + 1] = '\0';
	return 0;
}

//Converts txt into a json keyword file
int main() {
	//Open file
	FILE *out = fopen("kw.json", "w");
	fprintf(out, "[\n");

	char* word = malloc(256);
	if (getWord(word) != EOF) { 
		fprintf(out, "\t{\"kw\": [\"%s\"],", word);
		fprintf(out, " \"data\": \"%s\"}", word);
	}
	while (getWord(word) != EOF) {
		fprintf(out, ",\n");	
		fprintf(out, "\t{\"kw\": [\"%s\"],", word);
		fprintf(out, " \"data\": \"%s\"}", word);
	}

	free(word);

	//Close file
	fprintf(out, "\n]\n");
	fclose(out);
}
