FROM python:3

# Install Camoco
RUN pip install numpy Pillow
RUN pip install camoco camoco-cob

# Setup the user
RUN useradd -ms /bin/bash camoco
USER camoco

# Copy the example configuration file
COPY --chown=camoco:camoco example-camoco.conf /home/camoco/.camoco.conf
COPY --chown=camoco:camoco example-cob.conf /home/camoco/cob.conf

# Set the execution environment
EXPOSE 50000
WORKDIR /home/camoco
CMD cob -c /home/camoco/cob.conf
